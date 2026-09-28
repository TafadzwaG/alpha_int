/*
 * Copyright (C) 2010-2022 Talend Inc. - www.talend.com
 *
 * This source code is available under agreement available at
 * https://www.talend.com/legal-terms/us-eula
 *
 * You should have received a copy of the agreement
 * along with this program; if not, write to Talend SA
 * 5 rue Salomon de Rothschild - 92150 Suresnes
 *
 */

const maxInactivityInSeconds = (60 * 2);

// the watcher interval that can be stopped
let activityWatcherInterval;

// the number of seconds that have passed since the user was active
let secondsSinceLastActivity = 0;
const resetSecondsSinceLastActivity = () => { secondsSinceLastActivity = 0; };

// an array of DOM events that should be interpreted as user activity
const activityEvents = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
];

activityEvents.forEach((eventName) => {
  document.addEventListener(eventName, resetSecondsSinceLastActivity, true);
});

function isActive () {
  return secondsSinceLastActivity <= maxInactivityInSeconds;
}

function startWatchActivity (activityCallback) {
  resetSecondsSinceLastActivity();

  if (!activityWatcherInterval) {
    activityWatcherInterval = setInterval(() => {
      secondsSinceLastActivity++;
      activityCallback(isActive());
    }, 1000); // every second
  }
}

function stopWatchActivity () {
  clearInterval(activityWatcherInterval);
  activityWatcherInterval = null;
  resetSecondsSinceLastActivity();
}

window.APP.activity = {
  isActive,
  startWatchActivity,
  stopWatchActivity,
};
