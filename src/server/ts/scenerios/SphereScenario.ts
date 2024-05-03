import * as THREE from 'three'

export const SphereScenario = (): THREE.Scene => {
	const scene = new THREE.Scene()

	const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x0000ff }))
	floor.userData["visible"] = "true";
	floor.userData["physics"] = "box";
	floor.userData["name"] = "floor";
	floor.userData["mass"] = "0"
	floor.material.transparent = true
	floor.material.opacity = 0.5
	scene.add(floor)

	const sphere = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshStandardMaterial({ color: 0x0000ff }))
	sphere.userData["visible"] = "true";
	sphere.userData["physics"] = "sphere";
	sphere.userData["name"] = "sphere";
	sphere.userData["mass"] = "1"
	sphere.material.transparent = true
	sphere.material.opacity = 0.5
	sphere.position.y = 3
	sphere.position.x = 3
	scene.add(sphere)

	return scene
}