jest.mock('@/lib/whoop/oauth', () => ({ WHOOP_API_BASE: 'https://whoop.example.test' }));
import { fetchWorkouts } from '@/lib/whoop/api';
const fetchMock = jest.fn();
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
test('follows pagination before returning the complete collection', async () => {
  fetchMock.mockResolvedValueOnce({ ok:true,status:200,json:async()=>({records:[{id:'a'}],next_token:'next'}) })
    .mockResolvedValueOnce({ok:true,status:200,json:async()=>({records:[{id:'b'}]})});
  expect(await fetchWorkouts('synthetic','start','end')).toEqual([{id:'a'},{id:'b'}]);
  expect(fetchMock.mock.calls[1][0]).toContain('nextToken=next');
});
test('rate limits fail the import instead of returning partial records', async () => {
  fetchMock.mockResolvedValueOnce({ok:true,status:200,json:async()=>({records:[{id:'a'}],next_token:'next'})})
    .mockResolvedValueOnce({ok:false,status:429});
  await expect(fetchWorkouts('synthetic','start','end')).rejects.toThrow('429');
});
test('repeated pagination token is rejected', async () => {
  fetchMock.mockResolvedValue({ok:true,status:200,json:async()=>({records:[],next_token:'loop'})});
  await expect(fetchWorkouts('synthetic','start','end')).rejects.toThrow('Repeated');
});
