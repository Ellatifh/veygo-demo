
function statLoad(div, player) {
  const statsNode = document.createElement('div');
  statsNode.id = 'stats';
  statsNode.classList.add('stats');
  div.parentNode.insertBefore(statsNode, div.nextSibling);

  const currentTime = {};
  currentTime.node = document.createElement('div');
  statsNode.appendChild(currentTime.node);

  function addCurrentTime() {
    if (currentTime.interval) return;
    currentTime.interval = setInterval(() => {
      const now = new Date();
      const datestring =
        ("0" + now.getDate()).slice(-2) + "-" + ("0"+(now.getMonth()+1)).slice(-2) + "-" +
        now.getFullYear() + " " +
        ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2) + ":" +
        ("0" + now.getSeconds()).slice(-2) + ":" + ("00" + now.getMilliseconds()).slice(-3);
      currentTime.node.innerHTML = datestring;
    }, 50);
  }

  function removeCurrentTime() {
    while (currentTime.node.firstChild) {
      currentTime.node.removeChild(currentTime.node.firstChild);
    }
    clearInterval(currentTime.interval);
    delete currentTime.interval;
  }

  const dataNode = document.createElement('div');
  statsNode.appendChild(dataNode);
  setInterval(async () => {
    const timeInfo = await player.getTimeInfo();
    if (timeInfo && timeInfo.isLive) addCurrentTime(); else removeCurrentTime();
    if (!timeInfo) {
      dataNode.innerHTML = '';
      return;
    }
    const now = new Date();
    const toDisplay = {
    };
    if (timeInfo.position) {
      if (timeInfo.isLive) {
        toDisplay.liveDelayS = (now.getTime() - timeInfo.position) / 1000;
      }
      if (timeInfo.buffers && timeInfo.buffers.length) {
        toDisplay.bufferAheadS = (timeInfo.buffers[0].end - timeInfo.position) / 1000;
      }
    }

    // const stats = player.getStats();
    // toDisplay.stats = stats;
    dataNode.innerHTML = `ts: ${timeInfo.position} <br/>stats: ${JSON.stringify(toDisplay, null, 2).replace(/\n/g, '<br>')}`;
  }, 1000);
}
