import { requestExpandedMode } from '@devvit/web/client';

document.getElementById('play-button').addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  requestExpandedMode(event, 'game');
});