import { useCallback, useEffect, useState } from 'react';
import { useAsync } from 'react-use';
import { PolkadotApi } from '@dedot/chaintypes';
import { DedotClient, WsProvider } from 'dedot';
import type { Injected, InjectedAccount } from 'dedot/types';

const ENDPOINT = 'wss://rpc.ibp.network/paseo';

function App() {
  const [client, setClient] = useState<DedotClient<PolkadotApi>>();
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [extension, setExtension] = useState<Injected>();
  const [connectedWalletName, setConnectedWalletName] = useState<string>('');
  const [accounts, setAccounts] = useState<InjectedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [remarkMessage, setRemarkMessage] = useState<string>('');
  const [txStatus, setTxStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize DedotClient
  useAsync(async () => {
    try {
      console.time('init client took');
      const newClient = await DedotClient.new<PolkadotApi>({
        provider: new WsProvider(ENDPOINT),
        cacheMetadata: true,
      });
      setClient(newClient);
      console.timeEnd('init client took');
    } catch (err) {
      setError(`Failed to connect to network: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Detect available wallets from window.injectedWeb3
  useEffect(() => {
    const detectWallets = () => {
      if (window.injectedWeb3) {
        const wallets = Object.keys(window.injectedWeb3).filter((key) => {
          const provider = window.injectedWeb3[key];
          return provider && (provider.enable || provider.connect);
        });
        setAvailableWallets(wallets);
      }
    };

    // Detect immediately
    detectWallets();

    // Also detect after a short delay in case extensions load asynchronously
    const timer = setTimeout(detectWallets, 500);
    return () => clearTimeout(timer);
  }, []);

  // Connect to selected wallet
  const connectWallet = useCallback(async (walletName: string) => {
    try {
      setError('');
      const wallet = window.injectedWeb3?.[walletName];
      if (!wallet?.enable) {
        setError(`${walletName} wallet not found or does not support connection.`);
        return;
      }

      const injected = await wallet.enable('Dedot Example Dapp');
      setExtension(injected);
      setConnectedWalletName(walletName);

      const walletAccounts = await injected.accounts.get();
      setAccounts(walletAccounts);

      if (walletAccounts.length > 0) {
        setSelectedAccount(walletAccounts[0].address);
      }
    } catch (err) {
      setError(`Failed to connect to ${walletName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setExtension(undefined);
    setConnectedWalletName('');
    setAccounts([]);
    setSelectedAccount('');
    setTxStatus('');
    setTxHash('');
    setError('');
  }, []);

  // Submit system.remark transaction
  const submitRemark = useCallback(async () => {
    if (!client || !extension || !selectedAccount) {
      setError('Please connect wallet and select an account first');
      return;
    }

    if (!remarkMessage.trim()) {
      setError('Please enter a remark message');
      return;
    }

    try {
      setError('');
      setTxStatus('Preparing transaction...');
      setTxHash('');
      setIsSubmitting(true);

      const tx = client.tx.system.remark(remarkMessage);

      await tx.signAndSend(selectedAccount, { signer: extension.signer }, ({ status, txHash }) => {
        console.log('Transaction status:', status);
        setTxHash(txHash);

        if (status.type === 'Validated') {
          setTxStatus('Transaction validated');
        } else if (status.type === 'Broadcasting') {
          setTxStatus('Transaction broadcasting...');
        } else if (status.type === 'BestChainBlockIncluded') {
          setTxStatus(
            `Transaction included in best block #${status.value.blockNumber} (hash: ${status.value.blockHash})`,
          );
        } else if (status.type === 'Finalized') {
          setTxStatus(
            `✅ Transaction finalized in block #${status.value.blockNumber} (hash: ${status.value.blockHash})`,
          );
          setIsSubmitting(false);
          setRemarkMessage('');
        } else if (status.type === 'Invalid' || status.type === 'Drop') {
          setError(`Transaction ${status.type.toLowerCase()}`);
          setIsSubmitting(false);
        }
      });
    } catch (err) {
      setError(`Transaction failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsSubmitting(false);
      setTxStatus('');
    }
  }, [client, extension, selectedAccount, remarkMessage]);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Dedot Example: System.Remark Transaction</h1>

      {/* Network Connection Status */}
      <div
        style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: client ? '#d4edda' : '#fff3cd',
          border: `1px solid ${client ? '#c3e6cb' : '#ffeaa7'}`,
          borderRadius: '5px',
        }}>
        <strong>Network:</strong> {client ? `✅ Connected to ${ENDPOINT}` : `⏳ Connecting to ${ENDPOINT}...`}
      </div>

      {/* Wallet Connection */}
      <div style={{ marginBottom: '20px' }}>
        <h2>1. Connect Wallet</h2>
        {!extension ? (
          <>
            {availableWallets.length > 0 ? (
              <div>
                <p style={{ marginBottom: '10px', color: '#666' }}>Select a wallet to connect:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {availableWallets.map((walletName) => (
                    <button
                      key={walletName}
                      onClick={() => connectWallet(walletName)}
                      style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}>
                      Connect to {walletName}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '15px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '5px',
                  color: '#856404',
                }}>
                ⚠️ No wallet extensions detected. Please install a Polkadot wallet extension (e.g., Talisman, Subwallet,
                Polkadot.js).
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '5px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <span>
              ✅ Connected to <strong style={{ textTransform: 'capitalize' }}>{connectedWalletName}</strong> (
              {accounts.length} account{accounts.length !== 1 ? 's' : ''})
            </span>
            <button
              onClick={disconnectWallet}
              style={{
                padding: '5px 15px',
                fontSize: '14px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Account Selection */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2>2. Select Account</h2>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            style={{
              padding: '10px',
              fontSize: '16px',
              width: '100%',
              borderRadius: '5px',
              border: '1px solid #ddd',
            }}>
            {accounts.map((account) => (
              <option key={account.address} value={account.address}>
                {account.name || 'Unnamed'} ({account.address.slice(0, 8)}...{account.address.slice(-8)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Transaction Form */}
      {extension && selectedAccount && (
        <div style={{ marginBottom: '20px' }}>
          <h2>3. Submit Remark Transaction</h2>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Remark Message:</label>
            <input
              type='text'
              value={remarkMessage}
              onChange={(e) => setRemarkMessage(e.target.value)}
              placeholder='Enter your remark message...'
              disabled={isSubmitting}
              style={{
                padding: '10px',
                fontSize: '16px',
                width: '100%',
                borderRadius: '5px',
                border: '1px solid #ddd',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={submitRemark}
            disabled={isSubmitting || !remarkMessage.trim() || !client}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: isSubmitting || !remarkMessage.trim() || !client ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isSubmitting || !remarkMessage.trim() || !client ? 'not-allowed' : 'pointer',
            }}>
            {isSubmitting ? 'Submitting...' : 'Submit Remark'}
          </button>
        </div>
      )}

      {/* Transaction Status */}
      {txStatus && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#d1ecf1',
            border: '1px solid #bee5eb',
            borderRadius: '5px',
          }}>
          <strong>Status:</strong> {txStatus}
        </div>
      )}

      {/* Subscan Link */}
      {txHash && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '5px',
          }}>
          <strong>View Transaction:</strong>{' '}
          <a
            href={`https://paseo.subscan.io/extrinsic/${txHash}`}
            target='_blank'
            rel='noopener noreferrer'
            style={{
              color: '#007bff',
              textDecoration: 'underline',
            }}>
            {txHash.slice(0, 10)}...{txHash.slice(-8)} on Subscan ↗
          </a>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '5px',
            color: '#721c24',
          }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          marginTop: '40px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3d9ff',
          borderRadius: '5px',
        }}>
        <h3>ℹ️ Instructions</h3>
        <ol>
          <li>Make sure you have a Polkadot wallet extension installed (Talisman, Subwallet, Polkadot.js, etc.)</li>
          <li>Click on your preferred wallet to connect and authorize this dapp</li>
          <li>Select an account from the dropdown</li>
          <li>Enter a remark message and click "Submit Remark"</li>
          <li>Approve the transaction in your wallet popup</li>
          <li>Wait for the transaction to be finalized and view it on Subscan</li>
        </ol>
      </div>
    </div>
  );
}

export default App;
