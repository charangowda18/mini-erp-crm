import { Request } from 'express';

export enum UserRole {
  ADMIN = 'Admin',
  SALES = 'Sales',
  WAREHOUSE = 'Warehouse',
  ACCOUNTS = 'Accounts',
}

export enum CustomerType {
  RETAIL = 'Retail',
  WHOLESALE = 'Wholesale',
  DISTRIBUTOR = 'Distributor',
}

export enum CustomerStatus {
  LEAD = 'Lead',
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum ChallanStatus {
  DRAFT = 'Draft',
  CONFIRMED = 'Confirmed',
  CANCELLED = 'Cancelled',
}

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
