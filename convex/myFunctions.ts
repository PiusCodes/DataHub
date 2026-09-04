import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1800;
const MAX_TAGS = 6;

async function requireViewer(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Authentication required.");

  const user = await ctx.db.get(userId);
  if (!user?.email) throw new Error("Authenticated user is missing an email address.");

  return { userId, email: user.email.toLowerCase() };
}

function cleanText(value: string, fallback = "") {
  return value.trim().replace(/\s+/g, " ") || fallback;
}

function cleanPrice(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error("Price must be a positive number or zero.");
  return Math.round(value * 100) / 100;
}

function deriveQuality(title: string, description: string, fileName: string) {
  const metadataScore = Math.min(18, Math.floor(description.length / 60));
  const fileScore = fileName.includes(".") ? 6 : 0;
  const titleScore = title.length > 16 ? 5 : 0;
  return Math.min(98, 72 + metadataScore + fileScore + titleScore);
}

export const ensureUserProfile = mutation({
  args: {
    role: v.optional(v.union(v.literal("requester"), v.literal("uploader"))),
  },
  handler: async (ctx, args) => {
    const { userId, email } = await requireViewer(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        updatedAt: now,
      });
      return { ...existing, email };
    }

    const role = args.role ?? "requester";
    const id = await ctx.db.insert("profiles", {
      userId,
      email,
      role,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return {
      userId,
      email: user?.email ?? profile?.email ?? "",
      role: profile?.role ?? "requester",
    };
  },
});

export const listDatasets = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const search = cleanText(args.search ?? "");
    const rows = search
      ? await ctx.db
          .query("datasets")
          .withSearchIndex("search_datasets", (q) => q.search("title", search).eq("status", "listed"))
          .take(30)
      : await ctx.db.query("datasets").withIndex("by_status", (q) => q.eq("status", "listed")).order("desc").take(30);

    const purchases = userId
      ? await ctx.db
          .query("purchases")
          .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
          .collect()
      : [];
    const granted = new Set(purchases.filter((purchase) => purchase.status === "granted").map((purchase) => purchase.datasetId));

    return rows.map((dataset) => ({
      ...dataset,
      access: dataset.price === 0 || granted.has(dataset._id) ? "Access granted" : "Checkout required",
    }));
  },
});

export const getDatasetPreview = query({
  args: {
    datasetId: v.id("datasets"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.status !== "listed") throw new Error("Dataset is unavailable.");

    if (dataset.price > 0) {
      if (!userId) throw new Error("Authentication required.");

      const purchase = await ctx.db
        .query("purchases")
        .withIndex("by_dataset_buyer", (q) => q.eq("datasetId", args.datasetId).eq("buyerId", userId))
        .unique();
      if (purchase?.status !== "granted") throw new Error("Access has not been granted for this dataset.");
    }

    return {
      _id: dataset._id,
      title: dataset.title,
      previewData: dataset.previewData ?? "",
      records: dataset.records,
      updatedAt: dataset.updatedAt,
    };
  },
});

export const createDataset = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    license: v.string(),
    price: v.number(),
    fileName: v.string(),
    previewData: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, email } = await requireViewer(ctx);
    const title = cleanText(args.title).slice(0, MAX_TITLE_LENGTH);
    const description = cleanText(args.description, "No description provided.").slice(0, MAX_DESCRIPTION_LENGTH);
    if (!title) throw new Error("Dataset title is required.");

    const price = cleanPrice(args.price);
    const fileName = cleanText(args.fileName, "Uploaded dataset");
    const previewData = args.previewData?.trim() || undefined;
    if (previewData && previewData.length > 200000) throw new Error("Dataset preview is too large.");
    const license = cleanText(args.license, "CC-BY");
    const tags = [...new Set([license, ...(args.tags ?? [])].map((tag) => cleanText(tag)).filter(Boolean))].slice(0, MAX_TAGS);
    const quality = deriveQuality(title, description, fileName);
    const now = Date.now();

    const id = await ctx.db.insert("datasets", {
      title,
      description,
      license,
      price,
      fileName,
      ownerId: userId,
      ownerEmail: email,
      quality,
      preview: `Metadata preview for ${title}. Full files are served only after access is granted.`,
      ...(previewData ? { previewData } : {}),
      tags,
      records: `Source file: ${fileName}`,
      status: "listed",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

export const createRequest = mutation({
  args: {
    title: v.string(),
    desc: v.string(),
    budget: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, email } = await requireViewer(ctx);
    const title = cleanText(args.title).slice(0, MAX_TITLE_LENGTH);
    if (!title) throw new Error("Request title is required.");
    const now = Date.now();

    const id = await ctx.db.insert("requests", {
      title,
      desc: cleanText(args.desc, "No specifications added.").slice(0, MAX_DESCRIPTION_LENGTH),
      budget: cleanPrice(args.budget),
      requesterId: userId,
      requesterEmail: email,
      stage: "Submitted",
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const listRequests = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("requests").order("desc").take(30);
  },
});

export const requestAccess = mutation({
  args: {
    datasetId: v.id("datasets"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireViewer(ctx);
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.status !== "listed") throw new Error("Dataset is unavailable.");

    const existing = await ctx.db
      .query("purchases")
      .withIndex("by_dataset_buyer", (q) => q.eq("datasetId", args.datasetId).eq("buyerId", userId))
      .unique();
    if (existing) return existing;

    const status = dataset.price > 0 ? "checkout_required" : "granted";
    const id = await ctx.db.insert("purchases", {
      datasetId: args.datasetId,
      buyerId: userId,
      status,
      amount: dataset.price,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});
