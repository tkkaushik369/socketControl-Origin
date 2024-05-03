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
import { messageData, Player } from "./ts/messageData"
import DemoServer from "./ts/DemoServer"
import * as Scenario from "./ts/scenerios/Scenario"

const port: number = 3000
const privateHost: boolean = false

class App {
	private server: http.Server
	private port: number
	private io: Server

	private clients: {
		[id: string]: Player
	}
	private fixedTimeStep: number
	private clientInx: number
	private demo: DemoServer
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
		this.demo = new DemoServer()

		this.demo.addScenario('box', () => {
			var scene = Scenario.BoxScenario()
			this.demo.addScene(scene)
		})

		this.demo.addScenario('sphere', () => {
			const scene = Scenario.SphereScenario()
			this.demo.addScene(scene)
		})

		// Socket
		this.io.on("connection", (socket: Socket) => {
			this.OnConnect(socket)
			socket.on("disconnect", () => this.OnDisConnect(socket))
			socket.on("update", (message: messageData) => this.OnUpdate(socket, message))
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

		socket.emit("setid", message, (username: string) => {
			this.clients[socket.id].userName = username
			console.log("Player created: " + socket.id + " -> " + username);
		});
	}

	private OnDisConnect(socket: Socket) {
		console.log("socket disconnected : " + socket.id);
		if (this.clients && this.clients[socket.id]) {
			console.log("deleting " + socket.id);
			delete this.clients[socket.id]
			this.io.emit("removeClient", socket.id)
		}
		if (Object.keys(this.clients).length == 0) this.OnChangeScenario(-1)
	}

	private OnChangeScenario(inx: number) {
		this.currentScenarioIndex = inx
		console.log("Scenario Change: " + inx)
		this.demo.buildScene(inx)
		this.io.emit("changeScenario", inx)
	}

	private OnUpdate(socket: Socket, message: messageData) {
		this.clients[socket.id].timeStamp = message.timeStamp
		this.clients[socket.id].ping = message.ping
	}

	public Start() {
		this.server.listen(this.port, privateHost ? "127.0.0.1" : "0.0.0.0", () => {
			console.log(`Server listening on port ${this.port}.`)
		})
	}

	private socketLoop() {
		let data: {
			[id: string]: messageData
		} = {}
		Object.keys(this.demo.allBodies).forEach((p) => {
			data["world_ent_" + p] = {
				id: "world_ent_" + p,
				userName: "server",
				data: {
					position: {
						x: this.demo.allBodies[p].position.x,
						y: this.demo.allBodies[p].position.y,
						z: this.demo.allBodies[p].position.z,
					},
				},
				timeStamp: Date.now(),
				ping: -1,
			}
		})
		Object.keys(this.clients).forEach((p) => {
			data[p] = this.clients[p].out()
		})
		this.io.emit("players", data)
	};
}

new App(port).Start()