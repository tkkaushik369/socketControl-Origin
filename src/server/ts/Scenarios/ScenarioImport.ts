import { BoxScenario } from './BoxScenario'
import { CameraScenario } from './CameraScenario'
import { SphereScenario } from './SphereScenario'

export { BoxScenario } from './BoxScenario'
export { CameraScenario } from './CameraScenario'
export { SphereScenario } from './SphereScenario'

export function loadScenarios(demo: any) {
	demo.addScenario('box', () => {
		var scene = BoxScenario()
		demo.addScene(scene)
	})

	demo.addScenario('camera', () => {
		var scene = CameraScenario()
		demo.addScene(scene)
	})

	demo.addScenario('sphere', () => {
		const scene = SphereScenario()
		demo.addScene(scene)
	})
}