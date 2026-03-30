import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import GameScreen from '../screens/GameScreen'; 
import { HistoryModal } from '../components/modals/HistoryModal';
import { useState } from 'react';
import '@testing-library/jest-dom';

const mockHistoryResponse = {
  data: [
    { _id: { $oid: "1" }, date: "2026-03-18T10:00:00Z", opponent: "pro_bot", board_size: 6, difficulty: "Hard", result: "Derrota" },
    { _id: { $oid: "2" }, date: "2026-03-18T11:00:00Z", opponent: "edge_bot", board_size: 9, difficulty: "Easy", result: "Victoria" }
  ],
  page: 1,
  total_pages: 3
};

const GamePageMock = () => {
  const [showHistory, setShowHistory] = useState(false);
  // Eliminada la variable setHistoryData que no se usaba
  const historyData = mockHistoryResponse.data; 

  return (
    <>
      <GameScreen 
        username="Drus"
        boardData={null}
        winner={null}
        connectionStatus="Connected"
        difficultyChoice="facil"
        selectedBoardDimension={6}
        sizeLabel="6x6"
        turnTimeLeft={10}
        turnTimeLimit={20}
        timerVisible={true}
        onCellClick={vi.fn()}
        onEndGame={vi.fn()}
        onResetGame={vi.fn()}
        onExit={vi.fn()}
        onChangeDifficulty={vi.fn()}
        onChangeSize={vi.fn()}
        onFetchHistory={() => setShowHistory(true)}
      />
      <HistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        data={historyData}
        currentPage={1}
        totalPages={3}
        currentFilter={null}
        onPageChange={vi.fn()}
        onFilterChange={vi.fn()}
      />
    </>
  );
};

describe('Tests de Historial en MPA', () => {
  beforeEach(() => {
    localStorage.setItem('yovi_user', 'Drus');
    vi.stubGlobal('scrollTo', vi.fn());
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHistoryResponse
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test('abre el modal de historial y muestra los datos', async () => {
    const user = userEvent.setup();
    render(<GamePageMock />);

    const historyBtn = screen.getByRole('button', { name: /historial/i });
    await user.click(historyBtn);

    expect(await screen.findByText('pro_bot')).toBeInTheDocument();
    expect(screen.getByText('edge_bot')).toBeInTheDocument();
  });
});