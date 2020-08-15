/*
 * Loaders
 */

const VideoLoader = class {
  constructor() {
    this.loadMetaTimeout = false;
    this.inited = false;
    this.video = document.createElement("video");
  }
  load(url) {
    return new Promise((resolve, reject) =>
      Object.assign(this.video, {
        src: url,
        controls: false,
        autoplay: true,
        muted: true,
        loop: true,
        playsInline: true,
        crossOrigin: "anonymous",
        onended: () => {
          // rewind
          this.video.currentTime = 0;
          if (this.video.loop) this.video.play();
        },
        onerror: (e) => {
          //console.log("video error", e);
          reject(e);
        },
        oncanplay: () => {
          //console.log("can play video! ", this.video);
          // have enough data to play
          this.video.play();
        },
        onloadedmetadata: (...args) => {
          //console.log("video loadedmetadata ", ...args);
          clearTimeout(this.loadMetaTimeout);
          if (!this.video.autoplay) this.video.play(); // if autoplay eq false
        },
        onloadstart: (...args) => {
          //console.log("video loadstart ", ...args);
          this.loadMetaTimeout = setTimeout(
            () => this.video.onerror("load metadata timeout"),
            60 * 1000
          );
        },
        onplaying: () => {
          /*console.log(
                        `playing video ${this.video.videoWidth}x${this.video.videoHeight}! `,
                        this.video
                    );*/

          if (this.inited) {
            return;
          }
          this.inited = true;

          //console.log("resolve video");
          resolve(this.video);
        },
      })
    );
  }
};

const formUrlEncode = (form, submit_name) => {
  return Array.from(form.elements)
    .reduce((result, el) => {
      if (!el.checkValidity()) {
        el.reportValidity();
        throw { type: "validity", el };
      }
      if (el.type == "radio" && !el.checked) return result;
      if (el.type == "checkbox" && !el.checked) return result;
      if (el.type == "button") return result;
      if (submit_name && el.type == "submit" && el.name != submit_name)
        return result;
      if (el.name)
        result.push(
          encodeURIComponent(el.name)
            .replace(/%5B/gi, "[")
            .replace(/%5D/gi, "]") +
            "=" +
            encodeURIComponent(el.value)
        );
      return result;
    }, [])
    .join("&");
};

const formJsonEncode = (form, submit_name) => {
  const node = (to, key, default_value) => {
    const is_array = key === "";
    if (is_array) {
      const keys_exists = Object.keys(to)
        .map((k) => parseInt(k))
        .filter((i) => !isNaN(i));
      key = keys_exists.length ? Math.max(...keys_exists) : 0;
    }
    return to[key] ?? (to[key] = default_value);
  };

  return Array.from(form.elements).reduce((result, el) => {
    if (!el.checkValidity()) {
      el.reportValidity();
      throw { type: "validity", el };
    }
    if (el.type == "radio" && !el.checked) return result;
    if (el.type == "checkbox" && !el.checked) return result;
    if (el.type == "button") return result;
    if (submit_name && el.type == "submit" && el.name != submit_name)
      return result;
    if (el.name) {
      let name = el.name,
        assign_to = result,
        key,
        m;
      const keys = [];

      do {
        m = name.match(/^([^\[]*)\[([^\]]*)\]/);
        if (m) {
          keys.push(m[1]);
          name = name.replace(m[0], m[2]);
        } else {
          keys.push(name);
        }
      } while (m);

      while (keys.length) {
        const is_last = keys.length === 1;
        key = keys.shift();
        if (is_last) node(assign_to, key, el.value);
        else assign_to = node(assign_to, key, {});
      }
    }
    return result;
  }, {});
};

/*
 * Forms
 */

function axiosFormSubmitData(form, formdata) {
  const axios_instance = axiosInstance(this);
  return axios_instance[form.method](
    form.dataset.axios_action ?? form.action,
    formdata
  );
}

function axiosFormSubmit(form, submit_name, is_json) {
  const formdata = (is_json ? formJsonEncode : formUrlEncode)(
    form,
    submit_name
  );
  return axiosFormSubmitData.call(this, form, formdata);
}

function axiosForm(form, submit_name, is_json) {
  return () => axiosFormSubmit.call(this, form, submit_name, is_json);
}

/*
 * Storage
 */

let storage_info;
let storage_namespace = "/account/";

const axiosInstance = ($this) =>
  $this.defaults?.adapter ? $this : window.axios;

const storageNamespace = (namespace) => {
  storage_namespace =
    "/" + (namespace ? encodeURIComponent(namespace) + "/" : "");
};

async function storageInfo(refresh) {
  if (!refresh && storage_info) return storage_info;
  const axios = axiosInstance(this);
  storage_info = (await axios.get(storage_namespace + "storage/info")).data;
  return storage_info;
}

const makeFileListFilter = (allow_upload) => {
  const ext = allow_upload.ideal ? [allow_upload.ideal] : allow_upload.ext;
  const regex = new RegExp("\\.(" + ext.join("|") + ")$", "i");
  return function (file) {
    return (
      file.name &&
      regex.test(file.name) &&
      !/\.__preview__\.[^\.]+$/.test(file.name)
    );
  };
};

async function storageFilterList(url, filter_cb) {
  if (!storage_info) storage_info = await storageInfo.call(this);
  const axios = axiosInstance(this);
  let files = (await axios.get(url)).data;
  const previews = new Map();
  files.filter((file) => {
    const parent_filename = fileNameIsPreviewFor(file.name);
    if (typeof parent_filename === "string") {
      previews.set(parent_filename, file.name);
      return false;
    }
    return true;
  });
  if (filter_cb) files = files.filter(filter_cb);
  files = files.map(
    fileAssignAdditionalCallback(storage_info.container_url, previews)
  );
  return files;
}

const fileAssignAdditionalCallback = (url_prefix, previews) => {
  return (file) => {
    if (previews.has(file.name)) {
      file.preview_url = url_prefix + previews.get(file.name);
    }
    file.url = url_prefix + file.name;
    file.filename = file.name.split(/\//g).pop();
    file.printname = file.filename
      .replace(/[_\s]+/g, " ")
      .replace(/\.([^\.]+)$/, "")
      .trim();
    if (file.printname === "") file.printname = file.filename;
    return file;
  };
};

async function storageListFilter(filter_cb, dir = "") {
  if (dir.length && dir[0] != "/") dir = "/" + dir;
  const files = await storageFilterList.call(
    this,
    storage_namespace + "storage/list" + dir,
    filter_cb
  );
  return files;
}

async function storageListExamplesFilter(filter_cb, dir = "") {
  if (dir.length && dir[0] != "/") dir = "/" + dir;
  const files = await storageFilterList.call(
    this,
    storage_namespace + "storage/list_examples" + dir,
    filter_cb
  );
  return files;
}

async function storageList(allow_upload, dir) {
  return await storageListFilter.call(
    this,
    allow_upload ? makeFileListFilter(allow_upload) : undefined,
    dir
  );
}

async function storageListExamples(allow_upload, dir) {
  return await storageListExamplesFilter.call(
    this,
    allow_upload ? makeFileListFilter(allow_upload) : undefined,
    dir
  );
}

async function storagePut(put_params, file_uri, body, on_progress) {
  let put_url = put_params;
  if (typeof put_params == "object") {
    const { type, id, var_name = "url" } = put_params;
    put_url = `${storage_namespace}storage/put/${type}/${id}/${var_name}/`;
  } else if (
    typeof put_url == "string" &&
    put_url.indexOf(storage_namespace) !== 0
  ) {
    put_url = storage_namespace + put_url;
  } else {
    put_url = `${storage_namespace}storage/put/`;
  }
  if (!storage_info) storage_info = await storageInfo.call(this);
  const axios = axiosInstance(this),
    put_result = await axios.post(put_url + file_uri, body, {
      onUploadProgress: on_progress,
    });
  if (put_result.status === 201) {
    return storage_info.user_url + file_uri;
  } else {
    throw "HTTP " + put_result.status;
  }
}

const fileNameIsPreviewFor = (filename) => {
  const m = filename.match(/^(.*)\.__preview__\.[^\.]+$/);
  return m ? m[1] : undefined;
};

async function storagePutPreview(parent_file_uri, body, on_progress) {
  const put_params =
    storage_namespace == "/admin/"
      ? undefined
      : { type: "ObjectList", id: 1, var_name: "url" };
  return await storagePut.call(
    this,
    put_params,
    parent_file_uri + ".__preview__.jpg",
    body,
    on_progress
  );
}

async function storageConvert(
  allow_upload,
  file_uri,
  on_new_url,
  on_progress,
  check_interval = 2000
) {
  const ideal_ext = allow_upload.ideal,
    ext = file_uri.split(".").pop().toLowerCase();

  if (ideal_ext && ideal_ext !== ext) {
    let convert_result;
    const axios = axiosInstance(this);
    do {
      convert_result = await axios.get(
        storage_namespace + "storage/convert/" + file_uri + "?ext=" + ideal_ext
      );

      if (convert_result.data.new_url && on_new_url) {
        on_new_url(convert_result.data.new_url);
      }

      if (on_progress) on_progress(convert_result.data.progress);

      await new Promise((rv) => setTimeout(rv, check_interval));
    } while (!convert_result.data.done);

    if (convert_result.data.new_url) {
      return convert_result.data.new_url;
    } else {
      throw convert_result.data.progress;
    }
  } else {
    if (!storage_info) storage_info = await storageInfo.call(this);
    return storage_info.user_url + file_uri;
  }
}

async function storageDelete(file_uri) {
  if (typeof file_uri === "string") {
    try {
      const axios = axiosInstance(this),
        delete_result = await axios.post(
          storage_namespace + "storage/delete/" + file_uri
        );
      if (delete_result.status === 204) {
        return true;
      }
    } catch (e) {
      console.warn("delete error", e);
    }
  }
  return false;
}

async function storageDeleteUrl(url) {
  if (!storage_info) storage_info = await storageInfo.call(this);
  const file_uri = CdnUrlToFileUri(url);
  if (!file_uri) return;
  return await storageDelete.call(this, file_uri);
}

const CdnUrlToFileUri = (cdn_url) => {
  if (!storage_info) throw "call storageInfo() first";
  const file_uri = cdn_url.replace(storage_info.user_url, "");
  if (cdn_url === file_uri) {
    return;
  }
  return file_uri;
};

const UrlToObjectName = (url) => {
  return new URL(url).pathname.replace(/^(.*\/)(.+)/, "$2");
};

const ParseInputRules = (rules_str) => {
  return rules_str.split("|").reduce((rules, str) => {
    const [name, args_str] = str.split(":", 2),
      args = [];
    if (typeof args_str === "string") args.push(...args_str.split(","));
    rules[name] = args.reduce((arr, arg_str, i) => {
      if (!arr.names) arr.names = [];
      if (!arr.named) arr.named = {};
      let m = arg_str.match(/^([a-z0-9_]+)=(.+)$/),
        val_str = arg_str,
        val = arg_str,
        arg_name;
      if (m) {
        arr.names[i] = arg_name = m[1];
        val_str = m[2];
      }
      if (/^\d+$/.test(val_str)) {
        val = parseInt(val_str);
      } else if (/^\d+\.\d+$/.test(val_str)) {
        val = parseFloat(val_str);
      }
      arr[i] = val;
      if (arg_name) {
        arr.named[arg_name] = val;
      }
      return arr;
    }, []);
    return rules;
  }, {});
};

var Helper = {
  UrlToObjectName,
  ParseInputRules,

  VideoLoader,

  formUrlEncode,
  formJsonEncode,
  axiosForm,
  axiosFormSubmit,
  axiosFormSubmitData,

  storageNamespace,
  storageInfo,
  makeFileListFilter,
  CdnUrlToFileUri,
  storageListFilter,
  storageListExamplesFilter,
  storageList,
  storageListExamples,
  storagePut,
  storagePutPreview,
  storageConvert,
  storageDelete,
  storageDeleteUrl,
};
