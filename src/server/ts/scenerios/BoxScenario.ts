import * as THREE from 'three'

export const BoxScenario = (): THREE.Scene => {
	var scene = new THREE.Scene()

	const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x0000ff }))
	floor.userData["visible"] = "true"
	floor.userData["physics"] = "box"
	floor.userData["name"] = "floor"
	floor.userData["mass"] = "0"
	floor.material.transparent = true
	floor.material.opacity = 0.5
	scene.add(floor)

	const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x0000ff }))
	box.userData["visible"] = "true"
	box.userData["physics"] = "box"
	box.userData["name"] = "box"
	box.userData["mass"] = "1"
	box.material.transparent = true
	box.material.opacity = 0.5
	box.position.y = 3
	scene.add(box)

	return scene
}