function vote(first) {
    if (document.querySelector('span[style="font-size:20px;color:red;"]') != null) {
        chrome.runtime.sendMessage({message: document.querySelector('span[style="font-size:20px;color:red;"]').textContent})
        return
    }

    if (document.querySelector('b.page-spacer')) {
        chrome.runtime.sendMessage({successfully: true})
        return
    }

    if (first) return

    document.getElementById('postbut').click()
}