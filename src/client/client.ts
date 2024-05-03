import "./css/main.css"
import * as THREE from 'three'
import { io } from "socket.io-client"
import { messageData, Player } from "../server/ts/messageData"
import DemoClient from "./ts/DemoClient"
import * as Scenario from "../server/ts/scenerios/Scenario"

const pingStats = document.getElementById("pingStats") as HTMLDivElement
const workBox = document.getElementById("work") as HTMLDivElement

class App {
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
		this.socketLoop = this.socketLoop.bind(this)

		// Init
		this.clients = {}
		this.fixedTimeStep = 1.0 / 60.0; // fps
		this.player = new Player()
		this.demo = new DemoClient(workBox)
		this.demo.changeSceneCallBack = this.changeScenario

		// Setup camera
		this.demo.cameraController.theta = 0;
		this.demo.cameraController.target.x = 0;
		this.demo.cameraController.target.z = 60;
		this.demo.cameraController.target.y = 0;

		this.demo.addScenario('box', () => {
			var scene = Scenario.BoxScenario()
			this.demo.addScene(scene)
		})

		this.demo.addScenario('sphere', () => {
			const scene = Scenario.SphereScenario()
			this.demo.addScene(scene)
		})

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
		delete this.clients[id];
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

	private OnPlayers(players: { [is: string]: messageData }) {
		pingStats.innerHTML = "";
		Object.keys(players).forEach((p) => {
			pingStats.innerHTML += (players[p].userName != "server") ? players[p].userName : players[p].id
			pingStats.innerHTML += ": "
			pingStats.innerHTML += (players[p].userName != "server") ? players[p].ping : (Date.now() - players[p].timeStamp)
			pingStats.innerHTML += "ms"
			pingStats.innerHTML += ((players[p].id == this.player.id) ? "(you)" : "")
			pingStats.innerHTML += "<br>";

			this.demo.meshUpdate(p, players[p].data)
		})

	}

	private changeScenario(inx: number) {
		this.socket.emit("changeScenario", inx)
	}

	private socketLoop() {
		this.player.ping = Date.now() - this.player.timeStamp;
		this.player.timeStamp = Date.now();
		this.socket.emit("update", this.player.out());
	}
}

new App();