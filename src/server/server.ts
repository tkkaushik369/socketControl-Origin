// When starting this project by using `npm run dev`, this server script
// will be compiled using tsc and will be running concurrently along side webpack-dev-server
// visit http://127.0.0.1:8080

// In the production environment we don't use the webpack-dev-server, so instead type,
// `npm run build`        (this creates the production version of bundle.js and places it in ./dist/client/)
// `tsc -p ./src/server`  (this compiles ./src/server/server.ts into ./dist/server/server.js)
// `npm start            (this starts nodejs with express and serves the ./dist/client folder)
// visit http://127.0.0.1:3000

import express from "express"
import path from "path"
import http from "http"
import { Server, Socket } from "socket.io"
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { PlayerData, Player } from "./ts/PlayerData"
import WorldServer from "./ts/WorldServer"
import * as ScenarioImport from "./ts/Scenarios/ScenarioImport"
import * as Utility from './ts/Utils/Utility'

const port: number = 3000
const privateHost: boolean = false

class AppServer {
	private server: http.Server
	private port: number
	private io: Server

	private clients: {
		[id: string]: Player
	}
	private fixedTimeStep: number
	private clientInx: number
	private worldServer: WorldServer
	private currentScenarioIndex: number


	constructor(port: number) {
		// Bind Functions
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnUpdate = this.OnUpdate.bind(this)
		this.OnChangeScenario = this.OnChangeScenario.bind(this)
		this.socketLoop = this.socketLoop.bind(this)

		// Init
		this.port = port
		const app = express()
		app.use(express.static(path.join(__dirname, "../client")))

		this.server = new http.Server(app)
		this.io = new Server(this.server)

		this.clients = {}
		this.fixedTimeStep = 1.0 / 60.0; // fps
		this.clientInx = 0
		this.currentScenarioIndex = -1
		this.worldServer = new WorldServer()

		// Loading Scenarios
		ScenarioImport.loadScenarios(this.worldServer)

		// Socket
		this.io.on("connection", (socket: Socket) => {
			this.OnConnect(socket)
			socket.on("disconnect", () => this.OnDisConnect(socket))
			socket.on("update", (message: PlayerData) => this.OnUpdate(socket, message))
			socket.on("changeScenario", (inx: number) => this.OnChangeScenario(inx))
		})
		setInterval(this.socketLoop, this.fixedTimeStep * 1000)
	}

	private OnConnect(socket: Socket) {
		console.log("a user connected : " + socket.id)
		this.clients[socket.id] = new Player()
		this.clients[socket.id].id = socket.id
		this.clients[socket.id].data = "" + (++this.clientInx)

		let message = {
			id: this.clients[socket.id].id,
			data: this.clients[socket.id].data,
			scenario: this.currentScenarioIndex
		}

		{
			let p = socket.id
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
					this.worldServer.addBody(this.worldServer.world, body, p + "_player_" + child.userData.name)
					body.position.x = child.position.x
					body.position.y = child.position.y - 5
					body.position.z = child.position.z
					body.quaternion.x = child.quaternion.x
					body.quaternion.y = child.quaternion.y
					body.quaternion.z = child.quaternion.z
					body.quaternion.w = child.quaternion.w
				}
			})
		}


		socket.emit("setid", message, (username: string) => {
			this.clients[socket.id].userName = username
			console.log("Player created: " + socket.id + " -> " + username);
		});
	}

	private OnDisConnect(socket: Socket) {
		console.log("socket disconnected : " + socket.id);
		if (this.clients && this.clients[socket.id]) {
			console.log("deleting " + socket.id);
			Object.keys(this.worldServer.allBodies).forEach((p) => {
				if (p.includes(socket.id)) {
					this.worldServer.removeBody(this.worldServer.world, p)
				}
			});
			delete this.clients[socket.id]
			this.io.emit("removeClient", socket.id)
		}
		if (Object.keys(this.clients).length == 0) this.OnChangeScenario(-1)
	}

	private OnChangeScenario(inx: number) {
		this.currentScenarioIndex = inx
		console.log("Scenario Change: " + inx)
		this.worldServer.buildScene(inx)
		this.io.emit("changeScenario", inx)
	}

	private OnUpdate(socket: Socket, message: PlayerData) {
		this.clients[socket.id].timeStamp = message.timeStamp
		this.clients[socket.id].ping = message.ping
		this.clients[socket.id].data = message.data

		{
			Object.keys(this.worldServer.allBodies).forEach((p) => {
				if (p.includes(socket.id)) {
					if (this.clients[socket.id].data.position) {
						this.worldServer.allBodies[p].position.x = this.clients[socket.id].data.position.x
						this.worldServer.allBodies[p].position.y = this.clients[socket.id].data.position.y
						this.worldServer.allBodies[p].position.z = this.clients[socket.id].data.position.z
					}
					if (this.clients[socket.id].data.quaternion) {
						this.worldServer.allBodies[p].quaternion.x = this.clients[socket.id].data.quaternion.x
						this.worldServer.allBodies[p].quaternion.y = this.clients[socket.id].data.quaternion.y
						this.worldServer.allBodies[p].quaternion.z = this.clients[socket.id].data.quaternion.z
						this.worldServer.allBodies[p].quaternion.w = this.clients[socket.id].data.quaternion.w
					}
				}
			});
		}
	}

	public Start() {
		this.server.listen(this.port, privateHost ? "127.0.0.1" : "0.0.0.0", () => {
			console.log(`Server listening on port ${this.port}.`)
		})
	}

	private socketLoop() {
		let data: {
			[id: string]: PlayerData
		} = {}
		Object.keys(this.worldServer.allBodies).forEach((p) => {
			if (!p.includes("_player_")) {
				data["world_ent_" + p] = {
					id: "world_ent_" + p,
					userName: "server",
					data: {
						position: {
							x: this.worldServer.allBodies[p].position.x,
							y: this.worldServer.allBodies[p].position.y,
							z: this.worldServer.allBodies[p].position.z,
						},
						quaternion: {
							x: this.worldServer.allBodies[p].quaternion.x,
							y: this.worldServer.allBodies[p].quaternion.y,
							z: this.worldServer.allBodies[p].quaternion.z,
							w: this.worldServer.allBodies[p].quaternion.w,
						},
					},
					timeStamp: Date.now(),
					ping: -1,
				}
			} else {
				if (this.clients[p.split("_player_")[0]].userName) {
					data[p] = {
						id: p,
						userName: this.clients[p.split("_player_")[0]].userName + "_player_" + p.split("_player_")[1],
						data: {
							position: {
								x: this.worldServer.allBodies[p].position.x,
								y: this.worldServer.allBodies[p].position.y,
								z: this.worldServer.allBodies[p].position.z,
							},
							quaternion: {
								x: this.worldServer.allBodies[p].quaternion.x,
								y: this.worldServer.allBodies[p].quaternion.y,
								z: this.worldServer.allBodies[p].quaternion.z,
								w: this.worldServer.allBodies[p].quaternion.w,
							},
						},
						timeStamp: Date.now(),
						ping: -1,
					}
				}
			}
		})
		Object.keys(this.clients).forEach((p) => {
			data[p] = this.clients[p].out()
		})
		this.io.emit("players", data)
	};
}

new AppServer(port).Start()