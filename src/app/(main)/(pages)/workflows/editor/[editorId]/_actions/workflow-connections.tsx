"use server";

import { db } from "@/lib/db";
import { Option } from "@/store";

export const onCreateNodesEdges = async (
  flowId: string,
  nodes: string,
  edges: string,
  flowPath: string
) => {
  const flow = await db.workflows.update({
    where: {
      id: flowId
    },
    data: {
      nodes,
      edges,
      flowPath: flowPath
    }
  });

  if (flow) return { message: "Flow saved" };
};

export const onFlowPublish = async (workflowId: string, state: boolean) => {
  console.log(state);
  const published = await db.workflows.update({
    where: {
      id: workflowId
    },
    data: {
      publish: state
    }
  });

  if (published.publish) return "Workflow published";
  return "Workflow unpublished";
};

export const onCreateNodeTemplate = async (
  content: string,
  type: string,
  workflowId: string,
  channels?: Option[],
  accessToken?: string,
  notionDbId?: string
) => {
  if (type === "Discord") {
    const response = await db.workflows.update({
      where: {
        id: workflowId
      },
      data: {
        discordTemplate: content
      }
    });

    if (response) {
      console.log(response);
      return "Discord template saved";
    }
  }
  if (type === "Slack") {
    console.log("Channels received:", channels);

    const response = await db.workflows.update({
      where: { id: workflowId },
      data: {
        slackTemplate: content,
        slackAccessToken: accessToken
      }
    });

    if (response) {
      const channelList = await db.workflows.findUnique({
        where: { id: workflowId },
        select: { slackChannels: true }
      });

      const existingChannels = channelList?.slackChannels ?? [];
      const newChannels = channels?.map((channel) => channel.value) ?? [];

      // Suppression des doublons avec un Set
      const updatedChannels = [
        ...new Set([...existingChannels, ...newChannels])
      ];

      console.log("Updated Slack channels:", updatedChannels);

      // Mettre à jour la base de données en une seule requête au lieu de multiples boucles
      await db.workflows.update({
        where: { id: workflowId },
        data: { slackChannels: updatedChannels }
      });

      return "Slack template saved";
    }
  }

  if (type === "Notion") {
    const response = await db.workflows.update({
      where: {
        id: workflowId
      },
      data: {
        notionTemplate: content,
        notionAccessToken: accessToken,
        notionDbId: notionDbId
      }
    });

    if (response) return "Notion template saved";
  }
};
