import React from 'react';
import { FlexPlugin } from '@twilio/flex-plugin';

const PLUGIN_NAME = 'AutomaticTaskAcceptancePlugin';

export default class AutomaticTaskAcceptancePlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */

  // Actions Framework
  // When a reservation is created, immediately accept the reservation

  async init(flex, manager) {

    // Subscribe to call completion events in Twilio Flex
    const flexEvents = FlexWebChat.Manager.getInstance().store.getState().flex.config.serviceBaseUrl + '/events';
    const eventSource = new EventSource(flexEvents);

    eventSource.addEventListener('callCompleted', (event) => {
      const eventData = JSON.parse(event.data);
      const toNumber = eventData.To;

      // Trigger Twilio Function with the 'To' number and the message body
      fetch('/trigger-sms-function', {
        method: 'POST',
        body: JSON.stringify({
          To: toNumber,
          Body: 'Thak you for calling'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });


    manager.workerClient.on('reservationCreated', (reservation) => {
      const task = TaskHelper.getTaskByTaskSid(reservation.sid);

      // Only auto accept if it's not an outbound call from Flex
      if (!TaskHelper.isInitialOutboundAttemptTask(task)) {
        flex.Actions.invokeAction('AcceptTask', { sid: reservation.sid, isAutoAccept: true });
      }
    });

    flex.Actions.addListener('afterAcceptTask', (payload) => {
      // Only executing this code if the task was auto accepted by a plugin,
      // indicated by that plugin passing "isAutoAccept: true" in the payload
      if (payload.isAutoAccept) {
        flex.Actions.invokeAction('SelectTask', { sid: payload.sid });
        flex.AudioPlayerManager.play({
          url: process.env.REACT_APP_ANNOUNCE_MEDIA,
          repeatable: true,
        });
      }
    });
  }
}
