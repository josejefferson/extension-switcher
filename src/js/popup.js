const PINNED_EXTENSIONS_STORAGE = 'pinned'
const THIS_EXTENSION_ID = chrome.runtime.id
const $extensionListRoot = document.querySelector('.extension-list')

async function getExtensions() {
  const appsAndExtensions = await chrome.management.getAll()
  const allExtensions = appsAndExtensions.filter((extension) => extension.type === 'extension')
  const extensions = allExtensions.filter((extension) => extension.id !== THIS_EXTENSION_ID)
  const pinnedExtensions = await getPinnedExtensions()
  const extensionsWithPinned = extensions.map((extension) => {
    const pinned = pinnedExtensions.includes(extension.id)
    return { ...extension, pinned }
  })
  return extensionsWithPinned
}

function sortExtensions(extensions) {
  // Sort by name
  extensions = extensions.sort((a, b) => {
    return a.name.localeCompare(b.name)
  })

  // Sort by enabled
  extensions = extensions.sort((a, b) => {
    return a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1
  })

  // Sort by pinned
  extensions = extensions.sort((a, b) => {
    return a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1
  })

  return extensions
}

async function getPinnedExtensions() {
  const storage = await chrome.storage.sync.get(PINNED_EXTENSIONS_STORAGE)
  const pinnedExtensions = storage[PINNED_EXTENSIONS_STORAGE]
  if (!Array.isArray(pinnedExtensions)) {
    return []
  }
  return pinnedExtensions
}

async function toggleExtension(extension, enabled) {
  await chrome.management.setEnabled(extension.id, enabled)
}

async function togglePinned(id) {
  let pinnedExtensions = await getPinnedExtensions()
  if (pinnedExtensions.includes(id)) {
    pinnedExtensions = pinnedExtensions.filter((extensionID) => extensionID !== id)
  } else {
    pinnedExtensions = [...pinnedExtensions, id]
  }
  await chrome.storage.sync.set({ [PINNED_EXTENSIONS_STORAGE]: pinnedExtensions })
}

function renderExtensionList(extensions) {
  const extensionListColumns = sliceIntoChunks(extensions, 15)

  $extensionListRoot.innerHTML = ''

  for (const extensionColumn of extensionListColumns) {
    const $extensionColumn = document.createElement('div')
    $extensionColumn.classList.add('extension-column')

    for (const extension of extensionColumn) {
      const $extension = document.createElement('label')
      $extension.classList.add('extension')
      if (extension.pinned) $extension.classList.add('pinned')
      $extension.addEventListener('contextmenu', async (e) => {
        e.preventDefault()
        await togglePinned(extension.id)
        $extension.classList.toggle('pinned')
      })

      // Icon
      const icon = extension.icons?.at('-1')?.url
      const $extensionIcon = document.createElement('div')
      $extensionIcon.classList.add('extension-icon')
      const $extensionIconImg = document.createElement(icon ? 'img' : 'div')
      if (icon) {
        $extensionIconImg.src = icon
        $extensionIconImg.classList.add('extension-icon')
      } else {
        $extensionIconImg.classList.add('no-icon')
      }
      $extensionIcon.appendChild($extensionIconImg)
      $extension.appendChild($extensionIcon)

      // Name
      const $extensionName = document.createElement('div')
      $extensionName.classList.add('extension-name')
      $extensionName.innerText = extension.name
      $extension.appendChild($extensionName)

      // Switch
      const $extensionSwitch = document.createElement('div')
      $extensionSwitch.classList.add('extension-switch')
      const $extensionSwitchInner = document.createElement('div')
      $extensionSwitchInner.classList.add('switch')
      const $extensionSwitchInput = document.createElement('input')
      $extensionSwitchInput.type = 'checkbox'
      $extensionSwitchInput.checked = extension.enabled
      $extensionSwitchInput.addEventListener('change', (e) => toggleExtension(extension, e.target.checked))
      const $extensionSwitchTrack = document.createElement('span')
      $extensionSwitchInner.appendChild($extensionSwitchInput)
      $extensionSwitchInner.appendChild($extensionSwitchTrack)
      $extensionSwitch.appendChild($extensionSwitchInner)
      $extension.appendChild($extensionSwitch)

      $extensionColumn.appendChild($extension)
    }

    $extensionListRoot.appendChild($extensionColumn)
  }
}

async function main() {
  const extensions = await getExtensions()
  const sortedExtensions = sortExtensions(extensions)
  renderExtensionList(sortedExtensions)
}

main()
