import * as THREE from 'three'
import * as ScenarioImport from './Scenarios/ScenarioImport'

export type PlayerData = {
	id: string,
	userName: string,
	data: any,
	timeStamp: number,
	ping: number,
}

export class Player {
	public id: string
	public userName: string
	public data: any
	public timeStamp: number
	public ping: number
	public mesh: THREE.Object3D

	constructor() {
		this.id = ""
		this.userName = ""
		this.data = ""
		this.timeStamp = Date.now()
		this.ping = -1
		this.mesh = ScenarioImport.CameraScenario()
	}

	public out(): PlayerData {
		return {
			id: this.id,
			userName: this.userName,
			data: this.data,
			timeStamp: this.timeStamp,
			ping: this.ping,
		}
	}
}