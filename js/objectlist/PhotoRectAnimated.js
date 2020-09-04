var supGif = new SuperGif({ gif: document.getElementById('gif1') });
supGif.load();
var gifCanvas = supGif.get_canvas();

material = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    opacity: 1,
    transparent: true,
    alphaTest: 0.5,
});
material.map = new THREE.Texture(gifCanvas);
material.displacementMap = material.map;

var mesh = new THREE.Mesh(
    
    new THREE.PlaneGeometry(1, 1),material
);

resolve({
    get name() {
        return __("Color") + " " + page_object_params.vars.Color;
    },
    mesh,
    animate() {
        //material.displacementScale = 1;
        material.map.needsUpdate = true;
        //material.displacementMap.needsUpdate = true;
        /* noop */
    },
    destroy() {
        box.geometry.dispose();
        box.material.dispose();
    }
});
