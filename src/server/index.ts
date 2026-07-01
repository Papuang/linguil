import { Hono } from 'hono';
import { createServer, getServerPort, reddit, context, EntrypointHeight } from '@devvit/web/server';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { serve } from '@hono/node-server';
import { verifyToken } from './middleware';
import { addDailyWordRoute } from './routes/daily-word';
import { addLeaderboardRoute } from './routes/leaderboard';
import { addCreateCheckoutSessionRoute } from './routes/create-checkout-session';
import { addUserAccountRoute } from './routes/create-user-account';
import { addAudioRoute } from './routes/game/[...filePath]';
import { addEmailAuthRoute } from './routes/auth/email';
import { addExchangeTokenRoute } from './routes/auth/exchange';
import { addLogoutRoute } from './routes/auth/logout';
import { addPasswordResetRoute } from './routes/auth/password-reset';
import { addSessionAuthRoute } from './routes/auth/session';
import { addGameScoreRoute } from './routes/game/score';
import { addImageProxyRoute } from './routes/proxy/image';
import { addAddFriendRoute } from './routes/user/add-friend';
import { addFriendsRoute } from './routes/user/friends';
import { addMeRoute } from './routes/user/me';
import { addRemoveFriendRoute } from './routes/user/remove-friend';
import { addUpdateNameRoute } from './routes/user/update-name';
import { addGoogleAuthProxyRoute } from './routes/auth/google-start';
import { addDiscordStartRoute } from './routes/auth/discord-start';
import { addVerifyPaymentRoute } from './routes/verify-payment';
import { addAnalyticsRoute } from './routes/analytics';
import { addRedditAuthRoute } from './routes/auth/reddit-auth';
import { addFulfillOrderRoute } from './routes/fulfill-order';
import { addRefundOrderRoute } from './routes/refund-order';
import { getDailyWordData } from './lib/game/data-service-server';

const app = new Hono();

// Devvit-specific menu action.
app.post('/internal/menu/create-post', async (c) => {
  const { subredditName } = context;
  const _input = await c.req.json<MenuItemRequest>();
  try {
    await reddit.submitCustomPost({
      subredditName: subredditName!,
      title: 'linguil: the daily language guessing game',
      entry: 'default',
      runAs: 'USER',
      userGeneratedContent: {
        text: 'Play linguil: the daily language guessing game',
      },
      styles: {
        height: EntrypointHeight.TALL,
        backgroundColor: '#FAF7F0FF',
        backgroundColorDark: '#1C1917FF',
      },
    });
    return c.json<UiResponse>({ showToast: 'Post created!' });
  } catch (_error: any) {
    return c.json<UiResponse>({ showToast: 'Failed to create post.' });
  }
});

app.post('/internal/scheduler/daily-post', async (c) => {
  const _input = await c.req.json<TaskRequest>();
  const { subredditName } = context;

  if (!subredditName) {
    console.error("Scheduler ran without subreddit context");
    return c.json<TaskResponse>({ status: "ok" });
  }

  const dailyWordData = await getDailyWordData();
  if (!dailyWordData) {
      console.error("Failed to fetch daily word");
      return c.json<TaskResponse>({ status: "ok" });
  }

  try {
    const today = new Date();
    await reddit.submitCustomPost({
        subredditName: subredditName,
        title: `linguil | ${dailyWordData.word.transliteration} | ${dailyWordData.word.nativeScript} | ${today.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        })}`,
        entry: "game",
    });
    console.log(`Created daily post in ${subredditName}`);
  } catch (e) {
      console.error(`Failed to create post in ${subredditName}`, e);
  }

  return c.json<TaskResponse>({ status: "ok" });
});

// Apply middleware to protected routes.
app.use('/api/game/score', verifyToken);
app.use('/api/user/*', verifyToken);

addDailyWordRoute(app);
addLeaderboardRoute(app);
addCreateCheckoutSessionRoute(app);
addUserAccountRoute(app);
addAudioRoute(app);
addEmailAuthRoute(app);
addExchangeTokenRoute(app);
addLogoutRoute(app);
addPasswordResetRoute(app);
addSessionAuthRoute(app);
addImageProxyRoute(app);
addGoogleAuthProxyRoute(app);
addDiscordStartRoute(app);
addVerifyPaymentRoute(app);
addAnalyticsRoute(app);
addGameScoreRoute(app);
addAddFriendRoute(app);
addFriendsRoute(app);
addMeRoute(app);
addRemoveFriendRoute(app);
addUpdateNameRoute(app);
addRedditAuthRoute(app);
addFulfillOrderRoute(app);
addRefundOrderRoute(app);

// Error handler.
app.onError((err: Error, c) => {
  console.error('An error occurred:', err);
  return c.json({ message: 'Internal Server Error' }, 500);
});

serve({fetch: app.fetch, createServer: createServer, port: getServerPort()})