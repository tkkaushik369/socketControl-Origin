import "./css/main.css"
import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { io } from "socket.io-client"
import { PlayerData, Player } from "../server/ts/messageData"
import DemoClient from "./ts/DemoClient"
import * as ScenarioImport from '../server/ts/Scenarios/ScenarioImport'

if (navigator.userAgent.includes("QtWebEngine")) {
	document.body.classList.add("bodyTransparent");
	console.log("transparent")
}

const pingStats = document.getElementById("pingStats") as HTMLDivElement
const workBox = document.getElementById("work") as HTMLDivElement

export default class AppClient {
	private socket: any = io()
	private player: Player

	private clients: {
		[id: string]: Player
	}
	private fixedTimeStep: number
	private demo: DemoClient

	constructor() {
		// Bind Functions
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnRemoveClient = this.OnRemoveClient.bind(this)
		this.OnChangeScenario = this.OnChangeScenario.bind(this)
		this.OnSetID = this.OnSetID.bind(this)
		this.OnPlayers = this.OnPlayers.bind(this)
		this.changeScenario = this.changeScenario.bind(this)
		this.animateUpdate = this.animateUpdate.bind(this)
		this.socketLoop = this.socketLoop.bind(this)

		// Init
		this.clients = {}
		this.fixedTimeStep = 1.0 / 60.0; // fps
		this.player = new Player()
		this.demo = new DemoClient(this, workBox)
		this.demo.changeSceneCallBack = this.changeScenario
		this.demo.animateCallBack = this.animateUpdate

		// Setup camera
		this.demo.cameraController.theta = 36;
		this.demo.cameraController.phi = 36;
		this.demo.cameraController.target.x = 10 - 8;
		this.demo.cameraController.target.z = 30 - 24;
		this.demo.cameraController.target.y = 10 - 8;

		// Loading Scenarios
		ScenarioImport.loadScenarios(this.demo)

		// Socket
		this.socket.on("connect", this.OnConnect);
		this.socket.on("disconnect", this.OnDisConnect);
		this.socket.on("setid", this.OnSetID);
		this.socket.on("removeClient", this.OnRemoveClient);
		this.socket.on("changeScenario", this.OnChangeScenario);
		this.socket.on("players", this.OnPlayers);
	}

	private OnConnect() {
		console.log("connect")
	}

	private OnDisConnect(str: string) {
		console.log("disconnect " + str)
	}

	private OnRemoveClient(id: string) {
		console.log("removeClient: ", id);
		if (this.clients[id] !== undefined) {
			this.demo.removeLabel(id)
			this.demo.removeMesh(this.demo.scene, id)
			delete this.clients[id];
		}
	}

	private OnSetID(message: { id: string, data: string, scenario: number }, callBack: Function) {
		this.player.id = message.id;
		this.player.userName = "Player " + message.data;

		this.socket.emit("create", this.player.userName);
		console.log("Username: " + this.player.userName)
		this.demo.changeScene(message.scenario, false)
		callBack(this.player.userName)
		setInterval(this.socketLoop, this.fixedTimeStep * 1000)
	}

	private OnChangeScenario(inx: number) {
		this.demo.changeScene(inx, false)
	}

	private OnPlayers(players: { [is: string]: PlayerData }) {
		pingStats.innerHTML = "";
		Object.keys(players).forEach((p) => {
			if (!p.includes("world_ent_")) {
				pingStats.innerHTML += (players[p].userName != "server") ? players[p].userName : players[p].id
				pingStats.innerHTML += ": "
				pingStats.innerHTML += (players[p].userName != "server") ? players[p].ping : (Date.now() - players[p].timeStamp)
				pingStats.innerHTML += "ms"
				pingStats.innerHTML += ((players[p].id == this.player.id) ? "(you)" : "")
				pingStats.innerHTML += "<br>";
			}

			if ((p !== this.player.id) && (this.clients[p] === undefined) && (players[p].userName !== "")) {
				this.clients[p] = new Player()
			}
			if (this.clients[p] !== undefined) {
				if ((!p.includes("world_ent_")) && (this.demo.allMesh[p] === undefined)) {
					this.demo.addMesh(this.demo.scene, this.clients[p].mesh, p)
					this.demo.addLabel(this.clients[p].mesh, this.makeLabel(players[p].userName), p)
				}
			}
			this.demo.meshUpdate(p, players[p].data)
		})
	}

	private makeLabel(name: string) {
		let labelDiv = document.createElement('div')
		labelDiv.className = 'playerLabel'
		labelDiv.textContent = name
		let label = new CSS2DObject(labelDiv)
		label.position.set(0, 1, 0.5)
		label.layers.set(0)
		console.log("lab")
		return label
	}

	private animateUpdate() {
		this.player.data = {
			position: {
				x: this.demo.camera.position.x,
				y: this.demo.camera.position.y,
				z: this.demo.camera.position.z,
			},
			quaternion: {
				x: this.demo.camera.quaternion.x,
				y: this.demo.camera.quaternion.y,
				z: this.demo.camera.quaternion.z,
				w: this.demo.camera.quaternion.w,
			},
		}
	}

	private changeScenario(inx: number) {
		this.socket.emit("changeScenario", inx)
	}

	private socketLoop() {
		this.player.ping = Date.now() - this.player.timeStamp
		this.player.timeStamp = Date.now()
		this.socket.emit("update", this.player.out())
	}
}

new AppClient();