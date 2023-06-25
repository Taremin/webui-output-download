const WebSocket = window.WebSocket
class WebSocketHooked extends WebSocket {
    constructor(...args) {
        super(...args)

        this.addEventListener('message', (ev) => {
            const data = JSON.parse(ev.data)
            if (data.msg !== "process_completed") {
                return
            }

            const names = []
            let info
            for (const output of data.output.data) {
                switch (typeof output) {
                    case "object":
                        if (!Array.isArray(output)) {
                            break
                        }
                        for (const file of output) {
                            if (file["is_file"] && file["name"]) {
                                names.push(file["name"])
                            }
                        }
                        break
                    case "string":
                        const json = ((str) => {
                            try {
                                return JSON.parse(str)
                            } catch(e) {
                                return {}
                            }
                        })(output)
                        
                        if (json["prompt"]) {
                            info = json
                        }
                        break
                }
            }
            if (names.length > 0 && info) {
                onProcessCompleted(names, info)
            }
        })        
    }
}



const onProcessCompleted = async (files, info) => {
    const urls = []

    for (const path of files) {
        urls.push(new URL(window.location.origin + "/file=" + path).pathname)
    }
    
    for (const url of urls) {
        const image = await fetch(url).then(res => res.blob())
        writeFile(createFilename(url), image)
    }
}

const createFilename = (url) => {
    const date = new Date()
    const dateText = date.getFullYear().toString().padStart(4, '0') +
        [
            (date.getMonth() + 1),
            date.getDate(),
            date.getHours(),
            date.getMinutes()
        ].map((num) => num.toString().padStart(2, '0')).join('')
    
    return [dateText, basename(url)].join("_")
}

const basename = (url) => {
    return url.split("/").pop()
}

const register = async() => {
    if (!directoryHandle) {
        await getHandle()
    }
    window.WebSocket = WebSocketHooked
}

const unregister = () => {
    window.WebSocket = WebSocket
    directoryHandle = null
}

let directoryHandle

const getHandle = async () => {
    const dir = null
    const dirOption = {
        id: "webui-output-download",
        mode: "readwrite"
    }
    if (dir) {
        Object.assign(dirOption, {startIn: dir})
    }
    directoryHandle = await window.showDirectoryPicker(dirOption)
}

const isExists = async (filename) => {
    if (!directoryHandle) {
        await getHandle()
    }

    const fileHandle = await directoryHandle.getFileHandle(filename, {create: false}).catch((e) => {
        if (e instanceof DOMException) {
            return null
        }
        throw e
    })
    if (!fileHandle) {
        return false
    }
    if (fileHandle.kind === 'file') {
        return true
    }

    return false
}

const writeFile = async (filename, blob) => {
    if (!directoryHandle) {
        await getHandle()
    }

    if (await isExists(filename)) {
        // file is already exists
        return
    }
    
    const fileHandle = await directoryHandle.getFileHandle(filename, {create: true})
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
}

const addUI = () => {
    const container = document.createElement('div')
    container.style.position = "fixed"
    container.style.right = 0
    container.style.top = 0

    const button = document.createElement('button')
    const updateButton = () => {
        if (directoryHandle) {
            button.textContent = "🚫"
            button.title = "クリックすると出力の保存を停止します"
        } else {
            button.textContent = "⬇"
            button.title = "クリックすると次回Generateから出力の保存を行います"
        }
    }
    updateButton()
    button.addEventListener("click", async (ev) => {
        if (directoryHandle) {
            await unregister()
        } else {
            await register()
        }
        updateButton()
    })

    container.appendChild(button)

    document.body.appendChild(container)
}

onUiLoaded(addUI)