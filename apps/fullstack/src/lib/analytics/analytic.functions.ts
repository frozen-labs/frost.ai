import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyticsRepository } from "./analytics.repo";

export const getCustomerAnalytics = createServerFn({ method: "GET" })
  .validator(z.object({
    customerId: z.string(),
    startDate: z.string(), // ISO date string
    endDate: z.string(),   // ISO date string
  }))
  .handler(async ({ data }) => {
    try {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      return await analyticsRepository.getCustomerAnalytics(
        data.customerId,
        startDate,
        endDate
      );
    } catch (error) {
      console.error("Failed to get customer analytics:", error);
      throw error;
    }
  });

export const getCustomerPaymentSummary = createServerFn({ method: "GET" })
  .validator(z.object({
    customerId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }))
  .handler(async ({ data }) => {
    try {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      return await analyticsRepository.getCustomerPaymentSummary(
        data.customerId,
        startDate,
        endDate
      );
    } catch (error) {
      console.error("Failed to get customer payment summary:", error);
      throw error;
    }
  });

export const getRecentSignalCalls = createServerFn({ method: "GET" })
  .validator(z.object({
    customerId: z.string(),
    page: z.number().optional().default(1),
    limit: z.number().optional().default(10),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    try {
      const offset = (data.page - 1) * data.limit;
      return await analyticsRepository.getRecentSignalCalls(
        data.customerId,
        {
          limit: data.limit,
          offset,
          search: data.search,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        }
      );
    } catch (error) {
      console.error("Failed to get recent signal calls:", error);
      throw error;
    }
  });

export const getCustomerAgentSummary = createServerFn({ method: "GET" })
  .validator(z.object({
    customerId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }))
  .handler(async ({ data }) => {
    try {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      return await analyticsRepository.getCustomerAgentSummary(
        data.customerId,
        startDate,
        endDate
      );
    } catch (error) {
      console.error("Failed to get customer agent summary:", error);
      throw error;
    }
  });

export const getAllCustomers = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      return await analyticsRepository.getAllCustomers();
    } catch (error) {
      console.error("Failed to get all customers:", error);
      throw error;
    }
  });