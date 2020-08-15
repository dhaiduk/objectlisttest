// standard global variables
var camera, controls, stats, clock;
var animate_callbacks = [];

var raycaster = new THREE.Raycaster();
var clock = new THREE.Clock();

var container = document.getElementById("editor_td_id");
var renderer = new THREE.WebGLRenderer();
renderer.setSize(1000, 1000);
container.appendChild(renderer.domElement);
renderer.precision = "mediump";

// Our Javascript will go here.
var scene = new THREE.Scene();
//Todo get aspect of editor viewport
var VIEW_ANGLE = 45,
  /* ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,*/ NEAR = 0.1,
  FAR = 100;
camera = new THREE.PerspectiveCamera(VIEW_ANGLE, 1, NEAR, FAR);
scene.add(camera);
camera.position.set(0, 1.5, 4);
camera.lookAt(scene.position);
// CONTROLS
controls = new THREE.OrbitControls(camera, renderer.domElement);
// EVENTS
//THREEx.WindowResize(renderer, camera);
//THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
// STATS
stats = new Stats();
stats.domElement.style.position = "absolute";
stats.domElement.style.bottom = "0px";
stats.domElement.style.zIndex = 100;
container.appendChild(stats.domElement);
// LIGHT
var alight = new THREE.AmbientLight(0xffffff, 3); // soft white light
scene.add(alight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 10, 0);
scene.add(directionalLight);

//var light = new THREE.PointLight(0xffffff);
//light.position.set(0,250,0);
//scene.add(light);

// FLOOR
var floorTexture = new THREE.ImageUtils.loadTexture("data/qrcode.png");
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(1, 1);
var floorMaterial = new THREE.MeshBasicMaterial({
  map: floorTexture,
  side: THREE.DoubleSide,
});
var floorGeometry = new THREE.PlaneGeometry(2, 2, 10, 10);
var floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = Math.PI / 2;
scene.add(floor);

// SKYBOX/FOG
//https://threejsfundamentals.org/threejs/lessons/threejs-backgrounds.html
//https://hdrihaven.com/hdris/category/?c=indoor
{
  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
    "data/cubemaps/museum/pos-x.jpg",
    "data/cubemaps/museum/neg-x.jpg",
    "data/cubemaps/museum/pos-y.jpg",
    "data/cubemaps/museum/neg-y.jpg",
    "data/cubemaps/museum/pos-z.jpg",
    "data/cubemaps/museum/neg-z.jpg",
  ]);
  scene.background = texture;
}

async function object_list_loader(object_list_url) {
  const func_body = await (await fetch(object_list_url)).text();
  //console.log({ func_body });
  return eval(
    `({
		is_viewer = false,
		is_editor = false,
		Helper,
		THREE,
		renderer,
		camera,
		scene,
		raycaster,
		normalize_size_function = undefined,
		page_object_params
	}) => {
		return new Promise((resolve, reject) => { ${func_body} })
			.then(object => {
				if(normalize_size_function) normalize_size_function(object.mesh);
				page_object_params.object3d.add(object.mesh);
				page_object_params.object3d.name = object.name;
				page_object_params.object = object;
				if(object.animate) animate_callbacks.push(object.animate);
				return object;
			})
		;
	}`
  );
}

function normalize_size_function(object3d) {
  console.warn("normalize size of ", object3d);
  let size3 = object3d.size3;
  if (!size3) {
    size3 = new THREE.Vector3();
    new THREE.Box3().setFromObject(object3d).getSize(size3);
  }
  const scale = 1 / Math.max.apply(this, size3.toArray());
  object3d.scale.setScalar(scale);
}

function animate() {
  requestAnimationFrame(animate);
  const delta_time = clock.getDelta(); 
  animate_callbacks.forEach(cb => cb(delta_time))
  stats.update();
  renderer.render(scene, camera);
}

function __(s) {
  return s;
}
