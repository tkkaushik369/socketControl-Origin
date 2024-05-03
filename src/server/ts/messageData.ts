export type messageData = {
	id: string,
	userName: string,
	data: any,
	timeStamp: number,
	ping: number,
}

export class Player {
	public id: string
	public userName: string
	public data: string
	public timeStamp: number
	public ping: number

	constructor() {
		this.id = ""
		this.userName = ""
		this.data = ""
		this.timeStamp = Date.now()
		this.ping = -1
	}

	public out(): messageData {
		return {
			id: this.id,
			userName: this.userName,
			data: this.data,
			timeStamp: this.timeStamp,
			ping: this.ping,
		}
	}
}