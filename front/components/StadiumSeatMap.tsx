'use client';

import React from 'react';
import { Seat } from '../types';

interface StadiumSeatMapProps {
  seats: Seat[];
  selectedSeatId: number | null;
  selectedConcertId: number | null;
  onSelectSeat: (seat: Seat) => void;
  onResetSeats?: () => void;
  isLoading: boolean;
}

export default function StadiumSeatMap({
  seats,
  selectedSeatId,
  selectedConcertId,
  onSelectSeat,
  onResetSeats,
  isLoading,
}: StadiumSeatMapProps) {
  const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;
  const reservedCount = seats.filter((s) => s.status === 'RESERVED').length;
  const soldCount = seats.filter((s) => s.status === 'SOLD').length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col h-full">
      {/* 헤더 및 API 명세, 통계 */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-200">
              🏟️ 공연장 좌석 배치도
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              GET /api/v1/seats?concertId={selectedConcertId ?? 'id'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading ? '실시간 좌석 상태를 동기화하는 중...' : `총 ${seats.length}석 중 예매 가능 ${availableCount}석`}
          </p>
        </div>

        {/* 상태 레전드 & 카운트 & 리셋 버튼 */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span className="text-slate-300">선점가능 ({availableCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
            <span className="text-slate-300">선점중 ({reservedCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-600"></span>
            <span className="text-slate-300">판매완료 ({soldCount})</span>
          </div>

          {onResetSeats && (
            <button
              onClick={onResetSeats}
              title="현재 콘서트의 모든 좌석과 주문/결제 내역을 초기화합니다"
              className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/80 rounded text-xs font-sans font-medium transition flex items-center gap-1"
            >
              <span>🧹 좌석 초기화</span>
              <span className="text-[10px] font-mono text-amber-400/90 font-normal">
                [POST /api/v1/seats/reset/{selectedConcertId ?? 'id'}]
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 무대 영역 시각화 */}
      <div className="w-full bg-slate-800/80 border border-slate-700 text-center py-1.5 rounded text-xs font-bold text-slate-300 tracking-widest mb-3">
        [ STAGE / STADIUM CENTER ]
      </div>

      {/* 좌석 그리드 또는 스켈레톤 */}
      {isLoading || seats.length === 0 ? (
        /* 스켈레톤 좌석 UI */
        <div className="flex-1 border border-slate-800/80 rounded p-2 bg-slate-950/50 flex flex-col justify-center">
          <div className="text-center py-2 text-xs text-slate-400 font-mono animate-pulse mb-2">
            📡 PostgreSQL DB 좌석 데이터를 조회하고 있습니다...
          </div>
          <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 gap-1.5 overflow-hidden opacity-60">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="h-7 rounded border border-slate-800 bg-slate-800/50 animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : (
        /* 실제 DB 좌석 데이터 렌더링 */
        <div className="flex-1 overflow-auto max-h-[460px] border border-slate-800/80 rounded p-2 bg-slate-950/50">
          <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 gap-1.5 min-w-[500px]">
            {seats.map((seat) => {
              const isSelected = seat.id === selectedSeatId;
              let bgClass = '';

              if (seat.status === 'SOLD') {
                // 주문/선점 완료된 좌석은 선택 여부와 관계없이 빨간색으로 표시
                bgClass = isSelected
                  ? 'bg-rose-600 text-white ring-2 ring-rose-300 border-white font-bold shadow-lg cursor-not-allowed'
                  : 'bg-rose-600/80 text-white/90 border-rose-500 cursor-not-allowed';
              } else if (seat.status === 'RESERVED') {
                // 선점 중인 좌석은 주황색으로 표시
                bgClass = isSelected
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300 border-white font-bold shadow-lg cursor-not-allowed'
                  : 'bg-amber-500/80 text-white border-amber-400 cursor-not-allowed';
              } else {
                // 선점 가능한 좌석 (AVAILABLE)
                bgClass = isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300 border-white font-bold shadow-lg'
                  : 'bg-emerald-600/80 hover:bg-emerald-500 text-white border-emerald-500';
              }

              return (
                <button
                  key={seat.id}
                  disabled={seat.status !== 'AVAILABLE'}
                  onClick={() => onSelectSeat(seat)}
                  title={`좌석: ${seat.seatNumber} | 상태: ${seat.status} | 가격: ${seat.price?.toLocaleString()}원 | 버전: ${seat.version}`}
                  className={`text-[10px] h-7 rounded border font-mono transition-all flex items-center justify-center p-0.5 ${bgClass}`}
                >
                  {seat.seatNumber}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
