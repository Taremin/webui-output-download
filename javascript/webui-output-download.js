const onOutputImages = async (mutationRecords) => {
    const urls = []

    for (const record of mutationRecords) {
        if (!(record.target instanceof HTMLButtonElement)) {
            continue
        }
        for (const added of record.addedNodes) {
            if (!(added instanceof HTMLImageElement)) {
                continue
            }
            urls.push(added.src)
        }
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
    onUiUpdate(onOutputImages)
}

const unregister = () => {
    for (let i = uiUpdateCallbacks.length - 1; i >= 0; --i) {
        if (uiUpdateCallbacks[i] === onOutputImages) {
            uiUpdateCallbacks.splice(i, 1)
        }
    }
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

    try {
        const fileHandle = directoryHandle.getFileHandle(filename, {create: false})
        if (fileHandle.kind === 'file') {
            return true
        }
    } catch(e) {
        console.error("exception:", e)
        if (e instanceof DOMException) {
            console.log("dome")
            return false
        }
        //throw e
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
        button.textContent = directoryHandle ? "🚫" : "⬇"
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