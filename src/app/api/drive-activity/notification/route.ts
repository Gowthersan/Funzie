import { postContentToWebHook } from "@/app/(main)/(pages)/connections/_actions/discord-connect";
import { onCreateNewPageInDatabase } from "@/app/(main)/(pages)/connections/_actions/notion-connect";
import { postMessageToSlack } from "@/app/(main)/(pages)/connections/_actions/slack-connection";
import { db } from "@/lib/db";
import axios from "axios";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  console.log("🔴 Changed");
  const headersList = await headers();
  let channelResourceId;
  headersList.forEach((value, key) => {
    if (key == "x-goog-resource-id") {
      channelResourceId = value;
    }
  });

  if (channelResourceId) {
    console.log("🔍 Channel Resource ID:", channelResourceId);
    const user = await db.user.findFirst({
      where: {
        googleResourceId: channelResourceId
      },
      select: { clerkId: true, credits: true }
    });

    console.log("🔍 User:", user);

    if ((user && parseInt(user.credits!) > 0) || user?.credits == "Unlimited") {
      const workflow = await db.workflows.findMany({
        where: {
          userId: user.clerkId
        }
      });
      if (workflow) {
        console.log("🔍 Workflows:", workflow);

        workflow.map(async (flow) => {
          const flowPath = JSON.parse(flow.flowPath!);
          let current = 0;
          while (current < flowPath.length) {
            if (flowPath[current] == "Discord") {
              const discordMessage = await db.discordWebhook.findFirst({
                where: {
                  userId: flow.userId
                },
                select: {
                  url: true
                }
              });
              if (discordMessage) {
                console.log("🚀 Sending Discord message...");
                await postContentToWebHook(
                  flow.discordTemplate!,
                  discordMessage.url
                );
                console.log("✅ Discord message sent");
                flowPath.splice(flowPath[current], 1); // changement de flowPath[current]
              }
            }
            console.log("🔎 Checking flowPath:", flowPath);
            console.log("🔎 Current step:", flowPath[current]);
            if (flowPath[current] == "Slack") {
              console.log("🚀 Sending Slack message...");

              const channels = flow.slackChannels.map((channel) => {
                return {
                  label: "",
                  value: channel
                };
              });
              console.log(
                "📢 Slack flow detected, sending message to:",
                flow.slackChannels
              );
              const slackResponse = await postMessageToSlack(
                flow.slackAccessToken!,
                channels,
                flow.slackTemplate!
              );
              console.log("🟢 Slack response:", slackResponse);
              console.log("🚀 Preparing to send Slack message with:", {
                token: flow.slackAccessToken,
                channels: channels,
                message: flow.slackTemplate
              });

              console.log("✅ Slack message sent");
              flowPath.splice(flowPath[current], 1);
            }
            if (flowPath[current] == "Notion") {
              await onCreateNewPageInDatabase(
                flow.notionDbId!,
                flow.notionAccessToken!,
                JSON.parse(flow.notionTemplate!)
              );
              flowPath.splice(flowPath[current], 1);
            }

            if (flowPath[current] == "Wait") {
              const res = await axios.put(
                "https://api.cron-job.org/jobs",
                {
                  job: {
                    url: `${process.env.NGROK_URI}?flow_id=${flow.id}`,
                    enabled: "true",
                    schedule: {
                      timezone: "Europe/Istanbul",
                      expiresAt: 0,
                      hours: [-1],
                      mdays: [-1],
                      minutes: ["*****"],
                      months: [-1],
                      wdays: [-1]
                    }
                  }
                },
                {
                  headers: {
                    Authorization: `Bearer ${process.env.CRON_JOB_KEY!}`,
                    "Content-Type": "application/json"
                  }
                }
              );
              if (res) {
                flowPath.splice(flowPath[current], 1);
                const cronPath = await db.workflows.update({
                  where: {
                    id: flow.id
                  },
                  data: {
                    cronPath: JSON.stringify(flowPath)
                  }
                });
                if (cronPath) break;
              }
              break;
            }
            current++;
          }

          await db.user.update({
            where: {
              clerkId: user.clerkId
            },
            data: {
              credits: `${parseInt(user.credits!) - 1}`
            }
          });
        });
        return Response.json(
          {
            message: "Flow completed"
          },
          {
            status: 200
          }
        );
      }
    }
  }
  return Response.json(
    {
      message: "success"
    },
    {
      status: 200
    }
  );
}
