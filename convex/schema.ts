import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.id("users"),
    email: v.string(),
    role: v.union(v.literal("requester"), v.literal("uploader"), v.literal("admin"), v.literal("developer")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"]),
  datasets: defineTable({
    title: v.string(),
    description: v.string(),
    license: v.string(),
    price: v.number(),
    fileName: v.string(),
    ownerId: v.id("users"),
    ownerEmail: v.string(),
    quality: v.number(),
    preview: v.string(),
    previewData: v.optional(v.string()),
    tags: v.array(v.string()),
    records: v.string(),
    status: v.union(v.literal("listed"), v.literal("flagged"), v.literal("removed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_owner", ["ownerId"])
    .searchIndex("search_datasets", {
      searchField: "title",
      filterFields: ["status", "license"],
    }),
  requests: defineTable({
    title: v.string(),
    desc: v.string(),
    budget: v.number(),
    requesterId: v.id("users"),
    requesterEmail: v.string(),
    stage: v.union(v.literal("Submitted"), v.literal("In review"), v.literal("Matched"), v.literal("Fulfilled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stage", ["stage"])
    .index("by_requester", ["requesterId"]),
  purchases: defineTable({
    datasetId: v.id("datasets"),
    buyerId: v.id("users"),
    status: v.union(v.literal("granted"), v.literal("checkout_required")),
    amount: v.number(),
    createdAt: v.number(),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_dataset_buyer", ["datasetId", "buyerId"]),
});
