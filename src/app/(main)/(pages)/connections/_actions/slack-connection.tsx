"use server";

import { Option } from "@/components/ui/multiple-selector";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import axios from "axios";

export const onSlackConnect = async (
  app_id: string,
  authed_user_id: string,
  authed_user_token: string,
  slack_access_token: string,
  bot_user_id: string,
  team_id: string,
  team_name: string,
  user_id: string
): Promise<void> => {
  if (!slack_access_token) return;

  const slackConnection = await db.slack.findFirst({
    where: { slackAccessToken: slack_access_token },
    include: { connections: true }
  });

  if (!slackConnection) {
    await db.slack.create({
      data: {
        userId: user_id,
        appId: app_id,
        authedUserId: authed_user_id,
        authedUserToken: authed_user_token,
        slackAccessToken: slack_access_token,
        botUserId: bot_user_id,
        teamId: team_id,
        teamName: team_name,
        connections: {
          create: { userId: user_id, type: "Slack" }
        }
      }
    });
  }
};

export const getSlackConnection = async () => {
  const user = await currentUser();
  if (user) {
    return await db.slack.findFirst({
      where: { userId: user.id }
    });
  }
  return null;
};

export async function listBotChannels(
  slackAccessToken: string
): Promise<Option[]> {
  const url = `https://slack.com/api/conversations.list?${new URLSearchParams({
    types: "public_channel,private_channel",
    limit: "200"
  })}`;

  try {
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${slackAccessToken}` }
    });

    console.log("🔍 Slack API Channels Response:", data);

    if (!data.ok) throw new Error(data.error);

    if (!data?.channels?.length) return [];

    return data.channels
      .filter((ch: any) => ch.is_member)
      .map((ch: any) => {
        return { label: ch.name, value: ch.id };
      });
  } catch (error: any) {
    console.error("❌ Error listing bot channels:", error.message);
    throw error;
  }
}

const postMessageInSlackChannel = async (
  slackAccessToken: string,
  slackChannel: string,
  content: string
): Promise<void> => {
  try {
    const response = await axios.post(
      "https://slack.com/api/chat.postMessage",
      { channel: slackChannel, text: content },
      {
        headers: {
          Authorization: `Bearer ${slackAccessToken}`,
          "Content-Type": "application/json;charset=utf-8"
        }
      }
    );

    console.log("🔍 Slack API Response:", response.data);

    if (!response.data.ok) throw new Error(response.data.error);

    console.log(`✅ Message posted to channel ID: ${slackChannel}`);
  } catch (error: any) {
    console.error(
      `❌ Error posting to Slack channel ${slackChannel}:`,
      error?.response?.data || error.message
    );
  }
};

// Wrapper function to post messages to multiple Slack channels
export const postMessageToSlack = async (
  slackAccessToken: string,
  selectedSlackChannels: Option[],
  content: string
): Promise<{ message: string }> => {
  if (!content) return { message: "Content is empty" };
  if (!selectedSlackChannels?.length)
    return { message: "Channel not selected" };

  try {
    await Promise.all(
      selectedSlackChannels.map((channel) =>
        postMessageInSlackChannel(slackAccessToken, channel.value, content)
      )
    );
  } catch (error) {
    return { message: "Message could not be sent to Slack" };
  }

  return { message: "Success" };
};
