export interface Concert {
  id: number;
  title: string;
  venue: string;
  concertDate: string;
  totalSeats: number;
}

export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';
export type LockType = 'NONE' | 'OPTIMISTIC' | 'PESSIMISTIC';

export interface Seat {
  id: number;
  concertId: number;
  seatNumber: string;
  status: SeatStatus;
  price: number;
  version: number;
}

export interface OrderRequest {
  userId: number;
  concertId: number;
  seatId: number;
  lockType: LockType;
}

export interface OrderResponse {
  orderId: number;
  seatId: number;
  amount: number;
  status: string;
  createdAt: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface TestLog {
  id: string;
  time: string;
  type: 'INFO' | 'SUCCESS' | 'ERROR';
  message: string;
  latencyMs?: number;
}
