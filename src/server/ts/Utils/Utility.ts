import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as _ from 'lodash'

export function randNumb(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

export function getRandomMutedColor(pre = "") {
	var mutedColor = pre
	mutedColor += randNumb(75, 170).toString(16)
	mutedColor += randNumb(75, 170).toString(16)
	mutedColor += randNumb(75, 170).toString(16)
	return mutedColor
}

export function getBodyFromMesh(mesh: THREE.Mesh): CANNON.Body | undefined {
	if (mesh.userData.physics == "box") {
		let mass = mesh.userData.mass;
		if (mass === undefined) mass = 0;
		else mass = Number(mass)
		const parameter = (mesh.geometry as THREE.BoxGeometry).parameters
		const shape = new CANNON.Box(new CANNON.Vec3(parameter.width / 2, parameter.height / 2, parameter.depth / 2))
		const body = new CANNON.Body({ mass: mass, shape: shape })
		return body
	} else if (mesh.userData.physics == "sphere") {
		let mass = mesh.userData.mass;
		if (mass === undefined) mass = 0;
		else mass = Number(mass)
		const parameter = (mesh.geometry as THREE.SphereGeometry).parameters
		const shape = new CANNON.Sphere(parameter.radius)
		const body = new CANNON.Body({ mass: mass, shape: shape })
		return body
	}
}

export function setDefaults(options: {
	[id: string]: any } = {}, defaults: {
	[id: string]: any } = {}) {
	return _.defaults({}, _.clone(options), defaults);
}

export function createCapsuleGeometry(radius = 1, height = 2, N = 32) {
	return new THREE.CapsuleGeometry(radius, height, N/2, N)
}