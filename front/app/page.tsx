'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ConcertCarousel from '../components/ConcertCarousel';
import StadiumSeatMap from '../components/StadiumSeatMap';
import { Concert, Seat, LockType, TestLog, ApiResponse, OrderResponse } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export default function Home() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState<number | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [lockType, setLockType] = useState<LockType>('PESSIMISTIC');

  const [isConcertsLoading, setIsConcertsLoading] = useState<boolean>(true);
  const [isSeatsLoading, setIsSeatsLoading] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<TestLog[]>([]);

  const addLog = (type: 'INFO' | 'SUCCESS' | 'ERROR', message: string, latencyMs?: number) => {
    const newLog: TestLog = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString(),
      type,
      message,
      latencyMs,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  // 1. 콘서트 목록 조회 (GET /api/v1/concerts)
  const fetchConcerts = useCallback(async () => {
    setIsConcertsLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/concerts`);
      const latency = Math.round(performance.now() - start);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json: ApiResponse<Concert[]> = await res.json();
      if (json.data && json.data.length > 0) {
        setConcerts(json.data);
        setSelectedConcertId(json.data[0].id);
        setIsBackendOnline(true);
        addLog('SUCCESS', `[GET /api/v1/concerts] ${json.data.length}개 공연 로드 완료`, latency);
      } else {
        setConcerts([]);
        setIsBackendOnline(true);
        addLog('INFO', '[GET /api/v1/concerts] 등록된 공연이 없습니다.', latency);
      }
    } catch (e: any) {
      setIsBackendOnline(false);
      setConcerts([]);
      setSelectedConcertId(null);
      addLog('ERROR', `[GET /api/v1/concerts 실패] 백엔드 서버(8080) 연결 대기 중: ${e.message}`);
    } finally {
      setIsConcertsLoading(false);
    }
  }, []);

  // 2. 좌석 목록 조회 (GET /api/v1/seats?concertId={id})
  const fetchSeats = useCallback(async (concertId: number) => {
    setIsSeatsLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/seats?concertId=${concertId}`);
      const latency = Math.round(performance.now() - start);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json: ApiResponse<Seat[]> = await res.json();
      if (json.data) {
        setSeats(json.data);
        setIsBackendOnline(true);

        // 현재 선택된 좌석의 최신 상태 싱크
        setSelectedSeat((prev) => {
          if (!prev) return null;
          const fresh = json.data.find((s) => s.id === prev.id);
          return fresh || null;
        });

        addLog('INFO', `[GET /api/v1/seats?concertId=${concertId}] 좌석 ${json.data.length}석 동기화 완료`, latency);
      } else {
        setSeats([]);
      }
    } catch (e: any) {
      setSeats([]);
      setSelectedSeat(null);
      addLog('ERROR', `[GET /api/v1/seats 실패] 좌석 조회 실패: ${e.message}`);
    } finally {
      setIsSeatsLoading(false);
    }
  }, []);

  // 초기 로딩: 콘서트 목록 요청
  useEffect(() => {
    fetchConcerts();
  }, [fetchConcerts]);

  // 선택된 콘서트가 변경되면 해당 콘서트의 좌석 목록 조회
  useEffect(() => {
    if (selectedConcertId) {
      setSelectedSeat(null);
      fetchSeats(selectedConcertId);
    } else {
      setSeats([]);
      setSelectedSeat(null);
    }
  }, [selectedConcertId, fetchSeats]);

  // 3. 전체 좌석 리셋 (POST /api/v1/seats/reset/{concertId})
  const handleResetSeats = async () => {
    if (!selectedConcertId) return;

    setIsTesting(true);
    const start = performance.now();
    const endpoint = `/api/v1/seats/reset/${selectedConcertId}`;
    try {
      const res = await fetch(`${API_BASE}/seats/reset/${selectedConcertId}`, {
        method: 'POST',
      });
      const latency = Math.round(performance.now() - start);
      const json = await res.json();

      if (res.ok && json.success) {
        addLog('SUCCESS', `[POST ${endpoint}] 모든 좌석 및 주문/결제 내역 초기화 완료`, latency);
      } else {
        addLog('ERROR', `[POST ${endpoint} 실패] ${json.message || '초기화 실패'}`, latency);
      }
    } catch (e: any) {
      const latency = Math.round(performance.now() - start);
      addLog('ERROR', `[POST ${endpoint} 오류] ${e.message}`, latency);
    } finally {
      setIsTesting(false);
      // 백엔드 DB와 즉시 재동기화
      fetchSeats(selectedConcertId);
    }
  };

  // 4. 단일 1건 예매 (POST /api/v1/orders)
  const handleSingleOrder = async () => {
    if (!selectedSeat || !selectedConcertId) {
      alert('먼저 예매할 좌석을 선택하세요.');
      return;
    }

    setIsTesting(true);
    const start = performance.now();
    const endpoint = '/api/v1/orders';
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1001,
          concertId: selectedConcertId,
          seatId: selectedSeat.id,
          lockType,
        }),
      });

      const latency = Math.round(performance.now() - start);
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        addLog(
          'SUCCESS',
          `[POST ${endpoint}] 단일 예매 성공! 좌석: ${selectedSeat.seatNumber} | 주문ID: ${json.data.orderId} | 락: ${lockType}`,
          latency
        );
      } else {
        const errorMsg = json?.message || `HTTP ${res.status}: 예매 실패`;
        addLog('ERROR', `[POST ${endpoint} 실패 (${res.status})] ${errorMsg}`, latency);
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      addLog('ERROR', `[POST ${endpoint} 네트워크 오류] ${err.message}`, latency);
    } finally {
      setIsTesting(false);
      // DB 상태 최신화
      fetchSeats(selectedConcertId);
    }
  };

  // 5. 15명 동시 요청 부하 테스트 (POST /api/v1/orders x 15)
  const handleConcurrentTest = async () => {
    if (!selectedSeat || !selectedConcertId) {
      alert('동시성 테스트를 진행할 대상 좌석을 먼저 선택하세요.');
      return;
    }

    setIsTesting(true);
    const count = 15;
    const endpoint = '/api/v1/orders';
    addLog('INFO', `⚡ [POST ${endpoint} x ${count}] 동시성 부하 테스트 시작 | 좌석: ${selectedSeat.seatNumber} | 전략: ${lockType}`);

    const start = performance.now();
    const requests = Array.from({ length: count }, (_, idx) => {
      const userId = 2000 + idx + 1;
      return fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          concertId: selectedConcertId,
          seatId: selectedSeat.id,
          lockType,
        }),
      })
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          return { ok: res.ok, status: res.status, json, userId };
        })
        .catch((err) => ({ ok: false, status: 0, error: err.message, userId }));
    });

    const results = await Promise.all(requests);
    const totalLatency = Math.round(performance.now() - start);

    let successCount = 0;
    let failCount = 0;

    results.forEach((r) => {
      if (r.ok && 'json' in r && r.json?.success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    if (successCount === 1) {
      addLog(
        'SUCCESS',
        `🎉 [검증 성공] 15명 동시 요청 중 단 1건만 예매 성공! (성공: 1, 차단: ${failCount}) - 데이터 정합성 유지`,
        totalLatency
      );
    } else if (successCount > 1) {
      addLog(
        'ERROR',
        `🚨 [더블 부킹 발생!] 1개 좌석에 ${successCount}건 중복 예매 완료! (성공: ${successCount}, 실패: ${failCount}) - 락 제어 실패`,
        totalLatency
      );
    } else {
      addLog(
        'ERROR',
        `❌ [전원 실패] 모든 요청 실패 (성공: 0, 실패: ${failCount})`,
        totalLatency
      );
    }

    setIsTesting(false);
    // 즉시 DB 상태와 동기화
    fetchSeats(selectedConcertId);
  };

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      {/* 최상단 헤더 */}
      <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              🎫 Ticket Stream v1
            </h1>
            <span className="text-xs font-normal px-2 py-0.5 rounded bg-blue-900/80 text-blue-300 border border-blue-700">
              Spring Boot + PostgreSQL
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 font-mono ${
                isBackendOnline
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isBackendOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}></span>
              {isBackendOnline ? 'API 연결됨' : 'API 연결 대기중'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            단일 모놀리식 환경에서 비관적 락(Pessimistic) vs 낙관적 락(Optimistic)의 동시성 제어를 실시간 검증합니다.
          </p>
        </div>

        {/* 상단 글로벌 액션 버튼 (호출 API 표기) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => selectedConcertId && fetchSeats(selectedConcertId)}
            disabled={isSeatsLoading || !selectedConcertId}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium rounded border border-slate-700 text-slate-200 transition flex items-center gap-1.5"
          >
            <span>🔄 좌석 새로고침</span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1 py-0.5 rounded">
              GET /api/v1/seats
            </span>
          </button>

          <button
            onClick={handleResetSeats}
            disabled={isTesting || !selectedConcertId}
            className="px-3 py-1.5 bg-amber-950/70 hover:bg-amber-900 disabled:opacity-50 text-xs font-medium rounded border border-amber-700 text-amber-200 transition flex items-center gap-1.5"
          >
            <span>🧹 전체 좌석 리셋</span>
            <span className="text-[10px] font-mono text-amber-300/80 bg-amber-950 px-1 py-0.5 rounded">
              POST /api/v1/seats/reset/{selectedConcertId ?? 'id'}
            </span>
          </button>
        </div>
      </header>

      {/* 콘서트 선택 캐러셀 (스켈레톤 지원) */}
      <ConcertCarousel
        concerts={concerts}
        selectedConcertId={selectedConcertId}
        onSelectConcert={(id) => setSelectedConcertId(id)}
        isLoading={isConcertsLoading}
      />

      {/* 메인 작업 영역: 좌석 배치도 (좌) + 테스트 제어판 및 실시간 로그 (우) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 좌측: 좌석 배치도 (7 cols, 스켈레톤 지원) */}
        <div className="lg:col-span-7">
          <StadiumSeatMap
            seats={seats}
            selectedSeatId={selectedSeat?.id || null}
            selectedConcertId={selectedConcertId}
            onSelectSeat={(seat) => setSelectedSeat(seat)}
            onResetSeats={handleResetSeats}
            isLoading={isSeatsLoading}
          />
        </div>

        {/* 우측: 테스트 제어판 & 실시간 로그 터미널 (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* 테스트 컨트롤 패널 */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h2 className="text-sm font-semibold text-slate-200">
                ⚙️ 동시성 테스트 제어판
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                대상: 사용자 ID 1001 ~
              </span>
            </div>

            {/* 선택 좌석 정보 */}
            <div className="bg-slate-950/70 p-3 rounded border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">선택 좌석:</span>
                <span className="font-bold text-blue-400 font-mono">
                  {selectedSeat ? `${selectedSeat.seatNumber} (ID: ${selectedSeat.id})` : '좌석 배치도에서 좌석을 선택하세요'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">좌석 가격:</span>
                <span className="text-slate-200 font-mono">
                  {selectedSeat ? `${selectedSeat.price.toLocaleString()}원` : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">좌석 상태 / 버전:</span>
                <span className="font-mono flex items-center gap-1.5">
                  <span
                    className={`font-semibold ${
                      selectedSeat?.status === 'AVAILABLE'
                        ? 'text-emerald-400'
                        : selectedSeat?.status === 'RESERVED'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {selectedSeat ? selectedSeat.status : '-'}
                  </span>
                  {selectedSeat && (
                    <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                      ver.{selectedSeat.version}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* 락 전략 라디오 선택 */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                🔒 동시성 락 전략 선택
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['PESSIMISTIC', 'OPTIMISTIC', 'NONE'] as LockType[]).map((type) => {
                  const isSelected = lockType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLockType(type)}
                      className={`py-2 px-2 rounded text-xs font-mono font-semibold border transition text-center ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                {lockType === 'PESSIMISTIC' && '💡 비관적 락: SELECT FOR UPDATE 행 락으로 직렬화하여 1건만 선점 성공 보장.'}
                {lockType === 'OPTIMISTIC' && '💡 낙관적 락: @Version 비교로 선행 트랜잭션 성공 후 후행자는 409 Conflict 발생.'}
                {lockType === 'NONE' && '⚠️ 락 미적용: 동시 요청 시 1개 좌석에 중복 예매(더블 부킹) 데이터 결함 재현.'}
              </p>
            </div>

            {/* 기능 실행 버튼 2종 (호출 API 명세 표기) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleSingleOrder}
                disabled={!selectedSeat || selectedSeat.status !== 'AVAILABLE' || isTesting}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold rounded border border-slate-700 text-slate-100 transition flex flex-col items-center justify-center gap-0.5"
              >
                <span>단일 1건 예매</span>
                <span className="text-[10px] font-mono text-blue-400 font-normal">
                  POST /api/v1/orders
                </span>
              </button>

              <button
                onClick={handleConcurrentTest}
                disabled={!selectedSeat || selectedSeat.status !== 'AVAILABLE' || isTesting}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold rounded border border-indigo-400 text-white shadow transition flex flex-col items-center justify-center gap-0.5"
              >
                <span>{isTesting ? '⚡ 동시 요청 테스트 중...' : '⚡ 15명 동시 요청 테스트'}</span>
                <span className="text-[10px] font-mono text-indigo-200 font-normal">
                  POST /api/v1/orders x 15
                </span>
              </button>
            </div>
          </div>

          {/* 테스트 결과 & 실시간 로그 터미널 */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex-1 flex flex-col min-h-[240px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                💻 실시간 API 응답 & 동시성 테스트 로그
              </h3>
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                로그 지우기
              </button>
            </div>

            <div className="flex-1 overflow-auto max-h-[260px] space-y-1.5 font-mono text-[11px] bg-slate-950 p-2.5 rounded border border-slate-800/80">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-6">
                  아직 실행된 API 요청 및 테스트 로그가 없습니다.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`leading-relaxed border-l-2 pl-2 py-0.5 ${
                      log.type === 'SUCCESS'
                        ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                        : log.type === 'ERROR'
                        ? 'border-rose-500 text-rose-300 bg-rose-950/20'
                        : 'border-blue-500 text-slate-300'
                    }`}
                  >
                    <span className="text-slate-500 mr-1.5">[{log.time}]</span>
                    <span>{log.message}</span>
                    {log.latencyMs !== undefined && (
                      <span className="ml-1.5 text-xs text-amber-400 font-semibold">
                        ({log.latencyMs}ms)
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
