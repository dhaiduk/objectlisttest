const color = parseInt(page_object_params.vars.Color),
    intensity = parseFloat(page_object_params.vars.Intensity),
    mesh = new THREE.AmbientLight(color, intensity);

let helper;

mesh.size3 = new THREE.Vector3(1, 1, 1);

resolve({
    get name() {
        return [
            `${__("Color")} ${page_object_params.vars.Color}`,
            `${__("Intensity")} ${page_object_params.vars.Intensity}`
        ].join(", ");
    },
    mesh,
    animate() {
        /* noop */
    },
    destroy() {
        //mesh.dispose();
        //if (helper) helper.dispose();
    }
});
