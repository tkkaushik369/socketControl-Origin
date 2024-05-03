import "./css/main.css"
import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { io } from "socket.io-client"
import { PlayerData, Player } from "../server/ts/PlayerData"
import WorldClient from "./ts/WorldClient"
import * as ScenarioImport from '../server/ts/Scenarios/ScenarioImport'
import * as Utility from '../server/ts/Utils/Utility'

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
	private worldClient: WorldClient

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
		this.worldClient = new WorldClient(this, workBox)
		this.worldClient.changeSceneCallBack = this.changeScenario
		this.worldClient.animateCallBack = this.animateUpdate

		// Setup camera
		this.worldClient.cameraController.theta = 36;
		this.worldClient.cameraController.phi = 36;
		this.worldClient.cameraController.target.x = 10 - 8;
		this.worldClient.cameraController.target.z = 30 - 24;
		this.worldClient.cameraController.target.y = 10 - 8;

		// Loading Scenarios
		ScenarioImport.loadScenarios(this.worldClient)

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
			Object.keys(this.worldClient.allLabels).forEach((p) => {
				if(p.includes(id)) {
					this.worldClient.removeLabel(p)
				}
			});
			Object.keys(this.worldClient.allMeshs).forEach((p) => {
				if(p.includes(id)) {
					this.worldClient.removeMesh(this.worldClient.scene, p)
				}
			});
			Object.keys(this.worldClient.allBodies).forEach((p) => {
				if(p.includes(id)) {
					this.worldClient.removeBody(this.worldClient.world, p)
				}
			});
			delete this.clients[id];
		}
	}

	private OnSetID(message: { id: string, data: string, scenario: number }, callBack: Function) {
		this.player.id = message.id;
		this.player.userName = "Player " + message.data;

		this.socket.emit("create", this.player.userName);
		console.log("Username: " + this.player.userName)
		this.worldClient.changeScene(message.scenario, false)
		callBack(this.player.userName)
		setInterval(this.socketLoop, this.fixedTimeStep * 1000)
	}

	private OnChangeScenario(inx: number) {
		this.worldClient.changeScene(inx, false)
	}

	private OnPlayers(players: { [is: string]: PlayerData }) {
		pingStats.innerHTML = "";
		Object.keys(players).forEach((p) => {
			if (!p.includes("world_ent_") && !p.includes("_player_")) {
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
				if ((p.includes("_player_")) && (this.worldClient.allMeshs[p] === undefined)) {
					let mesh = this.clients[p].mesh
					let label = this.makeLabel(players[p].userName)
  					const sprite = this.makeTextSprite(players[p].userName)
  					mesh.add(sprite)
					this.worldClient.addMesh(this.worldClient.scene, mesh, p)
					this.worldClient.addLabel(this.clients[p].mesh, label, p)
					if(p.includes(this.player.id)) {
						mesh.visible = false
						label.visible = false
					}
					{
						let scene = this.clients[p].mesh
						var listMesh: any[] = []
						scene.children.forEach((child: any) => {
							if (child.isMesh) {
								listMesh.push(child)
							}
						})

						listMesh.forEach((child: any) => {
							let body = Utility.getBodyFromMesh(child)
							if ((body !== undefined) && (child.userData.name !== undefined)) {
								this.worldClient.addBody(this.worldClient.world, body, p+"_player_"+child.userData.name)
								body.position.x = child.position.x
								body.position.y = child.position.y
								body.position.z = child.position.z
								body.quaternion.x = child.quaternion.x
								body.quaternion.y = child.quaternion.y
								body.quaternion.z = child.quaternion.z
								body.quaternion.w = child.quaternion.w
							}
						})
					}
				}
			}
			this.worldClient.meshUpdate(p, players[p].data)
		})
	}

	makeTextSprite( message: string, parameters: { [id: string]: any } = {} ) {
		if ( parameters === undefined ) parameters = {};
		var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
		var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18;
		var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
		var borderColor = parameters.hasOwnProperty("borderColor") ?parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
		var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
		var textColor = parameters.hasOwnProperty("textColor") ?parameters["textColor"] : { r:0, g:0, b:0, a:1.0 };

		var canvas: HTMLCanvasElement = document.createElement('canvas');
		var context:any = canvas.getContext('2d');
		context.font = "Bold " + fontsize + "px " + fontface;
		var metrics = context.measureText( message );
		var textWidth = metrics.width;

		context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
		context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";

		context.lineWidth = borderThickness;
		context.rect(borderThickness/2, borderThickness/2, (textWidth + borderThickness) * 1.1, fontsize * 1.4 + borderThickness);


		context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
		context.fillText( message, borderThickness, fontsize + borderThickness);

		var texture = new THREE.Texture(canvas) 
		texture.needsUpdate = true;

		var spriteMaterial = new THREE.SpriteMaterial( { map: texture, /*useScreenCoordinates: false*/ } );
		var sprite = new THREE.Sprite( spriteMaterial );
		sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
		return sprite;  
    }

	private makeLabel(name: string) {
		let labelDiv = document.createElement('div')
		labelDiv.className = 'playerLabel'
		labelDiv.textContent = name
		let label = new CSS2DObject(labelDiv)
		label.position.set(0, 1, 0.5)
		label.layers.set(0)
		return label
	}

	private animateUpdate() {
		this.player.data = {
			position: {
				x: this.worldClient.camera.position.x,
				y: this.worldClient.camera.position.y,
				z: this.worldClient.camera.position.z,
			},
			quaternion: {
				x: this.worldClient.camera.quaternion.x,
				y: this.worldClient.camera.quaternion.y,
				z: this.worldClient.camera.quaternion.z,
				w: this.worldClient.camera.quaternion.w,
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