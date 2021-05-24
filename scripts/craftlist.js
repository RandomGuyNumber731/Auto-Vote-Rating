async function vote(first) {
    try {
        if (document.querySelector('div.alert.alert-success') != null) {
            if (document.querySelector('div.alert.alert-success').textContent.includes('vote was successfully')) {
                chrome.runtime.sendMessage({successfully: true})
            } else {
                chrome.runtime.sendMessage({message: document.querySelector('div.alert.alert-success').textContent})
            }
            return
        }
        if (document.querySelector('div.alert.alert-info') != null) {
            if (document.querySelector('div.alert.alert-info').textContent.includes('next vote')) {
                const numbers = document.querySelector('div.alert.alert-info').textContent.match(/\d+/g).map(Number)
                let count = 0
                let day = 0
                let month = 0
                let year = 0
                let hour = 0
                let min = 0
                let sec = 0
                for (const i in numbers) {
                    if (count == 0) {
                        day = numbers[i]
                    } else if (count == 1) {
                        month = numbers[i] - 1
                    } else if (count == 2) {
                        year = numbers[i]
                    } else if (count == 3) {
                        hour = numbers[i]
                    } else if (count == 4) {
                        min = numbers[i]
                    } else if (count == 5) {
                        sec = numbers[i]
                    }
                    count++
                }
                const later = Date.UTC(year, month, day, hour, min, sec) + 3600000
                chrome.runtime.sendMessage({later: later})
            } else {
                chrome.runtime.sendMessage({message: document.querySelector('div.alert.alert-info').textContent})
            }
            return
        }
        if (document.querySelector('a.btn-vote').textContent.includes('Next possible vote')) {
            //Из текста достаёт все цифры в Array List
            const numbers = document.querySelector('a.btn-vote').textContent.match(/\d+/g).map(Number)
            let count = 0
            let hour = 0
            let min = 0
            let sec = 0
            for (const i in numbers) {
                if (count == 0) {
                    hour = numbers[i]
                } else if (count == 1) {
                    min = numbers[i]
                } else if (count == 2) {
                    sec = numbers[i]
                }
                count++
            }
            const milliseconds = (hour * 60 * 60 * 1000) + (min * 60 * 1000) + (sec * 1000)
            const later = Date.now() + milliseconds
            chrome.runtime.sendMessage({later: later})
            return
        } else {
            document.querySelector('a.btn-vote').click()
        }

        if (first) return
        
        let project = await getProject('CraftList')
        let hours = document.querySelector('#voteModal p.text-center').textContent.match(/\d+/g).map(Number)[0]
        const milliseconds = (hours * 60 * 60 * 1000)
        if (project.timeout == null || project.timeout != milliseconds) {
            project.timeout = milliseconds
            await setProject(project)
        }
        document.querySelector('input[name="nickName"]').value = project.nick
        document.querySelector('button.btn.btn-vote').click()
    } catch (e) {
        throwError(e)
    }
}