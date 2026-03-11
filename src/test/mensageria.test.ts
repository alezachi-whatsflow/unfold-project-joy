import { describe, it, expect, vi } from "vitest";
import { formatPhone } from "@/services/messageService";

describe("formatPhone", () => {
  it("should add country code 55 if missing", () => {
    expect(formatPhone("43999011234")).toBe("5543999011234");
  });

  it("should not duplicate 55 prefix", () => {
    expect(formatPhone("5543999011234")).toBe("5543999011234");
  });

  it("should strip non-digit characters", () => {
    expect(formatPhone("+55 (43) 99901-1234")).toBe("5543999011234");
  });

  it("should remove leading zero", () => {
    expect(formatPhone("043999011234")).toBe("5543999011234");
  });

  it("should handle already formatted numbers", () => {
    expect(formatPhone("5511987654321")).toBe("5511987654321");
  });
});

describe("campaignService structure", () => {
  it("should export expected methods", async () => {
    const { campaignService } = await import("@/services/campaignService");
    expect(campaignService).toHaveProperty("createSimple");
    expect(campaignService).toHaveProperty("createAdvanced");
    expect(campaignService).toHaveProperty("control");
    expect(campaignService).toHaveProperty("listFolders");
    expect(campaignService).toHaveProperty("listMessages");
    expect(campaignService).toHaveProperty("clearDone");
    expect(campaignService).toHaveProperty("clearAll");
  });
});

describe("chatService structure", () => {
  it("should export expected methods", async () => {
    const { chatService } = await import("@/services/chatService");
    expect(chatService).toHaveProperty("checkNumbers");
    expect(chatService).toHaveProperty("find");
    expect(chatService).toHaveProperty("details");
    expect(chatService).toHaveProperty("editLead");
    expect(chatService).toHaveProperty("archive");
    expect(chatService).toHaveProperty("markRead");
    expect(chatService).toHaveProperty("deleteChat");
  });
});

describe("messageService structure", () => {
  it("should export expected methods", async () => {
    const { messageService } = await import("@/services/messageService");
    expect(messageService).toHaveProperty("sendText");
    expect(messageService).toHaveProperty("sendMedia");
    expect(messageService).toHaveProperty("sendContact");
    expect(messageService).toHaveProperty("sendLocation");
    expect(messageService).toHaveProperty("sendMenu");
    expect(messageService).toHaveProperty("sendCarousel");
    expect(messageService).toHaveProperty("sendPixButton");
    expect(messageService).toHaveProperty("sendRequestPayment");
    expect(messageService).toHaveProperty("markAsRead");
    expect(messageService).toHaveProperty("react");
    expect(messageService).toHaveProperty("edit");
    expect(messageService).toHaveProperty("delete");
  });
});

describe("instanceService structure", () => {
  it("should export expected methods", async () => {
    const { instanceService } = await import("@/services/instanceService");
    expect(instanceService).toHaveProperty("create");
    expect(instanceService).toHaveProperty("connect");
    expect(instanceService).toHaveProperty("disconnect");
    expect(instanceService).toHaveProperty("getStatus");
    expect(instanceService).toHaveProperty("listAll");
    expect(instanceService).toHaveProperty("delete");
    expect(instanceService).toHaveProperty("updateChatbotSettings");
    expect(instanceService).toHaveProperty("getPrivacy");
    expect(instanceService).toHaveProperty("updatePrivacy");
    expect(instanceService).toHaveProperty("syncAll");
  });
});

describe("contactService structure", () => {
  it("should export expected methods", async () => {
    const { contactService } = await import("@/services/chatService");
    expect(contactService).toHaveProperty("list");
    expect(contactService).toHaveProperty("listAll");
    expect(contactService).toHaveProperty("add");
    expect(contactService).toHaveProperty("remove");
  });
});

describe("labelService structure", () => {
  it("should export expected methods", async () => {
    const { labelService } = await import("@/services/chatService");
    expect(labelService).toHaveProperty("list");
    expect(labelService).toHaveProperty("edit");
  });
});
