export function onlinePlayers(presence, ownUid, ownName) {
  return Object.entries(presence || {}).filter(([, connections]) => connections && typeof connections === 'object').map(([uid, connections]) => {
    const names = Object.values(connections).map(value => value?.name).filter(name => typeof name === 'string' && name.trim());
    return { uid, name: uid === ownUid && ownName ? ownName : names.find(name => name !== 'Guest') || names[0] || 'Guest', self: uid === ownUid };
  }).sort((a, b) => Number(b.self) - Number(a.self) || a.name.localeCompare(b.name) || a.uid.localeCompare(b.uid));
}

export function renderPlayers(list, players, connected) {
  const items = players.map(player => {
    const item = document.createElement('li');
    item.className = player.self ? 'self' : '';
    const avatar = document.createElement('span');
    avatar.className = 'player-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = [...player.name][0]?.toUpperCase() || '?';
    const name = document.createElement('span');
    name.className = 'roster-name';
    name.textContent = player.name;
    item.append(avatar, name);
    if (player.self) {
      const you = document.createElement('span');
      you.className = 'you-label';
      you.textContent = 'you';
      item.append(you);
    }
    return item;
  });
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-roster';
    empty.textContent = connected ? 'No players online yet.' : 'Waiting for a connection…';
    items.push(empty);
  }
  list.replaceChildren(...items);
}
