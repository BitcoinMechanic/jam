import React, { createContext, useCallback, useContext, useReducer, useState, useEffect } from 'react'
// @ts-ignore
import { useCurrentWallet, useSetCurrentWallet, useSetCurrentWalletInfo } from './WalletContext'
// @ts-ignore
import { useWebsocket, CJ_STATE_TAKER_RUNNING, CJ_STATE_MAKER_RUNNING } from './WebsocketContext'
import { clearSession } from '../session'

import * as Api from '../libs/JmWalletApi'

// interval in milliseconds for periodic session requests
const SESSION_REQUEST_INTERVAL = 10_000

interface JmSessionData {
  session: boolean
  maker_running: boolean
  coinjoin_in_process: boolean
  wallet_name: string
}

type SessionFlag = { sessionActive: boolean }
type MakerRunningFlag = { makerRunning: boolean }
type CoinjoinInProgressFlag = { coinjoinInProgress: boolean }
type WalletName = { walletName: string | null }

type ServiceInfo = SessionFlag & MakerRunningFlag & CoinjoinInProgressFlag & WalletName
type ServiceInfoUpdate = ServiceInfo | MakerRunningFlag | CoinjoinInProgressFlag

interface ServiceInfoContextEntry {
  serviceInfo: ServiceInfo | null
  connectionError?: Error
}

const ServiceInfoContext = createContext<ServiceInfoContextEntry | undefined>(undefined)

const ServiceInfoProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const setCurrentWalletInfo = useSetCurrentWalletInfo()
  const websocket = useWebsocket()

  const [serviceInfo, dispatchServiceInfo] = useReducer(
    (state: ServiceInfo | null, obj: ServiceInfoUpdate) => ({ ...state, ...obj } as ServiceInfo | null),
    null
  )
  const [connectionError, setConnectionError] = useState<Error>()

  useEffect(() => {
    const shouldResetState = connectionError != null
    if (shouldResetState) {
      // Just reset the wallet info, not the session storage (token),
      // as the connection might be down shortly and auth information
      // is still valid most of the time.
      setCurrentWallet(null)
      setCurrentWalletInfo(null)
    }
  }, [connectionError, setCurrentWallet, setCurrentWalletInfo])

  useEffect(() => {
    const abortCtrl = new AbortController()

    const refreshSession = () => {
      Api.getSession({ signal: abortCtrl.signal })
        .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, res.statusText)))
        .then((data: JmSessionData) => {
          if (!abortCtrl.signal.aborted) {
            const {
              session: sessionActive,
              maker_running: makerRunning,
              coinjoin_in_process: coinjoinInProgress,
              wallet_name: walletNameOrNoneString,
            } = data
            const activeWalletName = walletNameOrNoneString !== 'None' ? walletNameOrNoneString : null

            dispatchServiceInfo({ sessionActive, makerRunning, coinjoinInProgress, walletName: activeWalletName })
            setConnectionError(undefined)

            const shouldResetState = currentWallet && (!activeWalletName || currentWallet.name !== activeWalletName)
            if (shouldResetState) {
              setCurrentWallet(null)
              setCurrentWalletInfo(null)
              clearSession()
            }
          }
        })
        .catch((err) => {
          if (!abortCtrl.signal.aborted) {
            setConnectionError(err)
          }
        })
    }

    refreshSession()
    const interval = setInterval(refreshSession, SESSION_REQUEST_INTERVAL)
    return () => {
      clearInterval(interval)
      abortCtrl.abort()
    }
  }, [dispatchServiceInfo, setConnectionError, currentWallet, setCurrentWallet, setCurrentWalletInfo])

  // update maker/taker indicator based on websocket data
  const onWebsocketMessage = useCallback(
    (message) => {
      const data = JSON.parse(message?.data)

      // update the maker/taker indicator according to `coinjoin_state` property
      if (data && typeof data.coinjoin_state === 'number') {
        dispatchServiceInfo({ coinjoinInProgress: data.coinjoin_state === CJ_STATE_TAKER_RUNNING })
        dispatchServiceInfo({ makerRunning: data.coinjoin_state === CJ_STATE_MAKER_RUNNING })
      }
    },
    [dispatchServiceInfo]
  )

  useEffect(() => {
    if (!websocket) return

    websocket.addEventListener('message', onWebsocketMessage)

    return () => websocket && websocket.removeEventListener('message', onWebsocketMessage)
  }, [websocket, onWebsocketMessage])

  return <ServiceInfoContext.Provider value={{ serviceInfo, connectionError }}>{children}</ServiceInfoContext.Provider>
}

const useServiceInfo = () => {
  const context = useContext(ServiceInfoContext)
  if (context === undefined) {
    throw new Error('useServiceInfo must be used within a ServiceInfoProvider')
  }
  return context.serviceInfo
}

const useSessionConnectionError = () => {
  const context = useContext(ServiceInfoContext)
  if (context === undefined) {
    throw new Error('useSessionConnectionError must be used within a ServiceInfoProvider')
  }
  return context.connectionError
}

export { ServiceInfoContext, ServiceInfoProvider, useServiceInfo, useSessionConnectionError }