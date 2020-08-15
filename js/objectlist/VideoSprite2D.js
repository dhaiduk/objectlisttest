var video,
    videoImage,
    videoImageContext,
    videoTexture,
    movieScreen,
    inited = false,
    loadMetaTimeout,
    autoplay = (page_object_params.vars.autoplay ?? 0) == 1,
    muted = (page_object_params.vars.muted ?? 0) == 1,
    loop = (page_object_params.vars.loop ?? 1) == 1;

const make_mesh = () => {
    videoTexture = new THREE.Texture(videoImage);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.needsUpdate = true;

    /*
        //https://habr.com/ru/post/436482/
        //var movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
        */
    var movieMaterial = new THREE.ShaderMaterial({
        uniforms: {
            /*Declare texture uniform in shader*/
            external_texture: { type: "t", value: null }
        },
        vertexShader: `
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }
            `,
        fragmentShader: `
                uniform sampler2D external_texture;
                varying vec2 vUv;

                void main()
                {
                    gl_FragColor = texture2D(external_texture, vUv);

                    vec3 color = vec3(0.0,1.0,0.0);
                    vec3 tColor = texture2D(external_texture, vUv).rgb;
                    gl_FragColor = vec4(tColor, (0.9 - dot(color, tColor) / (length(tColor) + 0.05)) * 3.0);
                    /*/if (gl_FragColor.g > 0.3 && gl_FragColor.r < 0.1  && gl_FragColor.b < 0.1 )
                        //gl_FragColor.a = 0.0;*/
                }
            `
    });

    movieMaterial.uniforms.external_texture.value = videoTexture;
    //movieMaterial.overdraw = true; // XXX s.yaglov three.js says property removed
    movieMaterial.side = THREE.DoubleSide;
    movieMaterial.transparent = true;

    /* the geometry on which the movie will be displayed;
        // 		movie image will be scaled to fit these dimensions.*/
    var movieGeometry = new THREE.PlaneGeometry(
        videoImage.width,
        videoImage.height,
        4,
        4
    );
    movieScreen = new THREE.Mesh(movieGeometry, movieMaterial);

    return movieScreen;
};

const make_object = () => {
    const mesh = make_mesh();
    return {
        get name() {
            return Helper.UrlToObjectName(page_object_params.vars.url);
        },
        mesh,
        animate() {
            if (video.readyState >= video.HAVE_CURRENT_DATA && !video.paused) {
                videoImageContext.drawImage(video, 0, 0);
                videoTexture.needsUpdate = true;
            }
        },
        destroy() {
            clearTimeout(loadMetaTimeout);
            video.pause();
            video.remove();
            //delete video;

            videoImage.remove();
            //delete videoImage;

            mesh.geometry.dispose();
            videoTexture.dispose();
            mesh.material.dispose();
        },
        get media() {
            return video;
        }
    };
};

new Helper.VideoLoader()
    .load(page_object_params.vars.url)
    .then(v => {
        video = v;

        video.loop = loop;
        video.autoplay = autoplay;
        if (autoplay) {
            video.muted = true;
        } else {
            video.pause();
            video.muted = muted;
        }

        videoImage = document.createElement("canvas");

        videoImage.width = parseInt(video.videoWidth);
        videoImage.height = parseInt(video.videoHeight);

        console.log(
            `create canvas ${videoImage.width}x${videoImage.height}`,
            videoImage
        );

        videoImageContext = videoImage.getContext("2d");

        try {
            videoImageContext.drawImage(video, 0, 0);
            resolve(make_object());
        } catch (e) {
            // XXX s.yaglov ff bug
            if (e.name == "NS_ERROR_NOT_AVAILABLE") {
                reject("FF BUG: NS_ERROR_NOT_AVAILABLE");
            } else {
                reject(e); // throw another exception
            }
        }
    })
    .catch(e => {
        reject(e);
    });
