import {NUM_OF_CHANNELS, START_CHANNEL} from './channels';
import {db} from './database';
import {IChannel, IEntry} from './shared-interfaces';

export const scheduleEntries = async (): Promise<void> => {
  const unscheduledEntries = await db.entries.find<IEntry>({channel: {$exists: false}}).sort({start: 1});
  unscheduledEntries &&
    unscheduledEntries.length &&
    console.log(`There are ${unscheduledEntries.length} unscheduled entries`);

  for (const entry of unscheduledEntries) {
    const availableChannels = await db.schedule.find<IChannel>({endsAt: {$lt: entry.start}}).sort({channel: 1});

    if (!availableChannels || !availableChannels.length) {
      const channelNums = await db.schedule.count({});

      if (channelNums > NUM_OF_CHANNELS - 1) {
        continue;
      }

      const newChannelNum = channelNums + START_CHANNEL;

      console.log('Creating a new channel: ', newChannelNum);

      await db.schedule.insert<IChannel>({
        channel: newChannelNum,
        endsAt: entry.end,
      });

      console.log(`Assigning ${entry.name} to Channel #${newChannelNum}`);
      await db.entries.update<IEntry>({_id: entry._id}, {$set: {channel: newChannelNum}});
    } else {
      await db.schedule.update<IChannel>({_id: availableChannels[0]._id}, {$set: {endsAt: entry.end}});
      console.log(`Assigning ${entry.name} to Channel #${availableChannels[0].channel}`);
      await db.entries.update<IEntry>({_id: entry._id}, {$set: {channel: availableChannels[0].channel}});
    }
  }
};
