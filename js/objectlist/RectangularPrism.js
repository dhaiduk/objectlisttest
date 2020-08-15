var mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({
        color: parseInt(page_object_params.vars.Color)
    })
);

resolve({
    get name() {
        return __("Color") + " " + page_object_params.vars.Color;
    },
    mesh,
    animate() {
        /* noop */
    },
    destroy() {
        box.geometry.dispose();
        box.material.dispose();
    }
});
