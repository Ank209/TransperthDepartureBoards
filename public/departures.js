const socket = io();
const DateTime = luxon.DateTime;

const stopUpdateFrequency = 5; //Seconds
const stopsPerPage = 12;
let platformsUpdating = [];
let currentTimouts = [];
let mainTimeoutId;

socket.on('departuresUpdate', (data) => {
  loadStation(data);
});

const getStation = (stationName) => {
  clearTimeout(mainTimeoutId);
  console.log(`Reloading all data for ${stationName}`)
  fetch(`/station/${stationName}`)
  //Reload data every 30 mins
  setTimeout(() => { getStation('Perth Stn') }, 30 * 60 * 1000)
  window.scrollTo(0, 0);
}

const loadStation = (data) => {
  let timeToNextUpdate = 10; //Math.max(Math.min(nextUpdate, 10), 4);
  console.log(`Next update in ${timeToNextUpdate} seconds.`)
  mainTimeoutId = setTimeout(() => {
    loadStation(data)
  }, timeToNextUpdate * 1000)
  
  console.log(data);
  const platforms = [];
  platformsUpdating = [];
  currentTimouts.forEach(timoutId => {
    clearTimeout(timoutId);
  });
  currentTimouts = [];

  data.time = DateTime.fromISO(data.time);
  data.trains.forEach(train => {
    if (platforms.indexOf(train.platform) == -1 && train.platform != 0) {
      platforms.push(train.platform);
    }
    train.scheduledDeparture = DateTime.fromISO(train.scheduledDeparture);
    train.minutesDelayed = Number(train.minutesDelayed);
    train.actualDeparture = train.scheduledDeparture.plus({ minutes: train.minutesDelayed });
    const timeToDeparture = train.actualDeparture.diff(DateTime.now(), 'seconds').toObject().seconds;
    if (timeToDeparture < 0) {
      train.platform = 0;
    }
    if (typeof train.stops == 'string') {
      train.stops = train.stops.split(',')
    }
  });
  platforms.sort();
  console.log(platforms);

  document.getElementById('main-board-container').innerHTML = '';
  platforms.forEach(platform => {
    const currentTrains = data.trains.filter(train => train.platform === platform)
    createBoard(currentTrains);
  });
  const stationNameElement = document.getElementById('station-name');
  stationNameElement.innerText = data.stationName;
  stationNameElement.style.color = getLineColour(data.trains[0].lineFull)
}

const updateStops = (id, stops, first) => {
  if (platformsUpdating.indexOf(id) != -1) {
    const stopElement = document.getElementById(id);
    //console.log(`Updating ${id}`);
    if (stopElement) {
      if (first) {
        stopElement.innerText = stops.slice(0, stopsPerPage - 1).join();
      } else {
        stopElement.innerText = stops.slice(stopsPerPage - 1).join();
      }
    }
    if (stops.length > stopsPerPage) {
      currentTimouts.push(setTimeout(() => {
        updateStops(id, stops, !first)
      }, stopUpdateFrequency * 1000));
    } else {
      platformsUpdating.splice(platformsUpdating.indexOf(id), 1);
    }
  }
}

const createBoard = (trains) => {
  const board = document.createElement('div');
  board.classList.add('platform-board');

  const header = document.createElement('div');
  header.classList.add('board-header');
  header.style.backgroundColor = getLineColour(trains[0].lineFull)

  const headerSpan1 = document.createElement('span');
  headerSpan1.innerText = `Platform ${trains[0].platform}`;
  header.appendChild(headerSpan1);
  const headerSpan2 = document.createElement('span');
  headerSpan2.innerText = `Mins`;
  header.appendChild(headerSpan2);
  const headerSpan3 = document.createElement('span');
  headerSpan3.innerText = `Pattern`;
  header.appendChild(headerSpan3);
  const headerSpan4 = document.createElement('span');
  headerSpan4.innerText = `Cars`;
  header.appendChild(headerSpan4);
  board.appendChild(header);

  const destination = document.createElement('div');
  destination.classList.add('board-destination');
  const destinationSpan1 = document.createElement('span');
  destinationSpan1.innerText = trains[0].destination;
  destination.appendChild(destinationSpan1);
  const destinationSpan2 = document.createElement('span');
  const timeDiff = trains[0].actualDeparture.diff(DateTime.now(), 'minutes');
  const remainingMinutes = Math.max(Math.ceil(timeDiff.toObject().minutes), 1)
  destinationSpan2.innerText = remainingMinutes;
  if (remainingMinutes == 1) {
    destinationSpan2.classList.add('flashing-text');
  }
  destination.appendChild(destinationSpan2);
  const destinationSpan3 = document.createElement('span');
  destinationSpan3.innerText = trains[0].pattern;
  destination.appendChild(destinationSpan3);
  const destinationSpan4 = document.createElement('span');
  destinationSpan4.innerText = trains[0].cars;
  destination.appendChild(destinationSpan4);
  board.appendChild(destination);

  const divider1 = document.createElement('hr');
  divider1.classList.add('divider');
  board.appendChild(divider1);

  const stops = document.createElement('div');
  stops.classList.add('board-stops');
  const stopsSpan1 = document.createElement('span');
  stopsSpan1.innerText = 'Stops at:';
  stops.appendChild(stopsSpan1);
  const stopsSpan2 = document.createElement('span');
  stopsSpan2.id = `platform-${trains[0].platform}-stops`
  if (trains[0].stops.length > stopsPerPage) {
    stopsSpan2.innerText = trains[0].stops.slice(0, stopsPerPage - 1).join();
    if (platformsUpdating.indexOf(stopsSpan2.id) == -1) {
      platformsUpdating.push(stopsSpan2.id);
      currentTimouts.push(setTimeout(() => {
        updateStops(stopsSpan2.id, trains[0].stops, false);
      }, stopUpdateFrequency * 1000));
    }
  } else {
    stopsSpan2.innerText = trains[0].stops.join();
  }
  stops.appendChild(stopsSpan2);
  board.appendChild(stops);

  const divider2 = document.createElement('hr');
  divider2.classList.add('divider');
  board.appendChild(divider2);

  const thenHeader = document.createElement('div');
  thenHeader.classList.add('board-then-header');
  const thenHeaderSpan1 = document.createElement('span');
  thenHeaderSpan1.innerText = `Then:`;
  thenHeader.appendChild(thenHeaderSpan1);
  const thenHeaderSpan2 = document.createElement('span');
  thenHeaderSpan2.innerText = `Mins`;
  thenHeader.appendChild(thenHeaderSpan2);
  const thenHeaderSpan3 = document.createElement('span');
  thenHeaderSpan3.innerText = `Pattern`;
  thenHeader.appendChild(thenHeaderSpan3);
  const thenHeaderSpan4 = document.createElement('span');
  thenHeaderSpan4.innerText = `Cars`;
  thenHeader.appendChild(thenHeaderSpan4);
  board.appendChild(thenHeader);

  const then = document.createElement('div');
  then.classList.add('board-then');
  if (trains[1]) {
    const thenSpan1 = document.createElement('span');
    thenSpan1.innerText = trains[1].destination;
    then.appendChild(thenSpan1);
    const thenSpan2 = document.createElement('span');
    const remainingNext = trains[1].actualDeparture.diff(DateTime.now(), 'minutes');
    thenSpan2.innerText = Math.ceil(remainingNext.toObject().minutes);
    then.appendChild(thenSpan2);
    const thenSpan3 = document.createElement('span');
    thenSpan3.innerText = trains[1].pattern;
    then.appendChild(thenSpan3);
    const thenSpan4 = document.createElement('span');
    thenSpan4.innerText = trains[1].cars;
    then.appendChild(thenSpan4);
  }
  board.appendChild(then);

  const divider3 = document.createElement('hr');
  divider3.classList.add('divider');
  board.appendChild(divider3);

  const extras = document.createElement('div');
  extras.classList.add('board-extras');
  const scrollingContainer = document.createElement('div');
  scrollingContainer.classList.add('scrolling-container')
  const extrasSpan1 = document.createElement('span');
  extrasSpan1.classList.add('scrolling-text');
  if (trains[0].minutesDelayed > 0) {
    const extrasText = `${trains[0].lineFull} is currently delayed by ${trains[0].minutesDelayed} minute(s).`;
    extrasSpan1.innerText = `${extrasText}`;
  }
  scrollingContainer.appendChild(extrasSpan1);
  extras.appendChild(scrollingContainer);
  const extrasSpan2 = document.createElement('span');
  extrasSpan2.innerText = DateTime.now().toLocaleString(DateTime.TIME_SIMPLE);
  extras.appendChild(extrasSpan2);
  board.appendChild(extras);

  const mainContainer = document.getElementById('main-board-container');
  mainContainer.appendChild(board);
}

const getLineColour = (lineName) => {
  //console.log('Line name', lineName)
  switch (lineName) {
    // Trains
    case 'Yanchep Line':
      return '#939336';
    case 'Fremantle Line':
      return '#005da6';
    case 'Armadale Line':
      return '#f4a81d';
    case 'Mandurah Line':
      return '#d05f27';
    case 'Midland Line':
      return '#961a4b';
    case 'Airport Line':
      return '#4ac0b0';
    case 'Ellenbrook Line':
      return '#FF0000';
    case 'Thornlie-Cockburn Line':
      return '#a172c3'
    default:
      // Bus?
      return '#008000';
  }
}

window.onload = () => {
  getStation('Perth Stn');
}
