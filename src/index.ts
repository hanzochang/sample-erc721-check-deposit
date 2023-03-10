import { ethers } from 'ethers'

const getCollection = async (holderAddress: string): Promise<number[]> => {
  // アドレスが同値かどうかを判定する関数
  const isAddressesEqual = (address1: string, address2: string) => {
    return address1.toLowerCase() === address2.toLowerCase()
  }

  // 設定値： ABI(Transferイベントのみ抽出)
  const sampleAbi = [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'from',
          type: 'address',
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          indexed: true,
          internalType: 'uint256',
          name: 'tokenId',
          type: 'uint256',
        },
      ],
      name: 'Transfer',
      type: 'event',
    },
  ]

  // ① Provider　インスタンスを作成する。
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC_URL as string,
    parseInt(process.env.NETWORK as string)
  )

  // ② 　Contract インスタンスを作成する。
  const contract = new ethers.Contract(
    process.env.NFT_CONTRACT_ADDRESS as string,
    sampleAbi,
    provider
  )

  // ③ 調べたいホルダーのウォレットの過去のtokenIdの送信イベントログすべて取得する。
  const sentLogs = await contract.queryFilter(
    // contract.filters.Transfer(holderAddress, null)
    contract.filters.Transfer(process.env.DEPOSITED_ON_WALLET_ADDRESS, null)
  )

  // ④ 調べたいホルダーのウォレットの過去のtokenIdの受信イベントログすべて取得する。
  const receivedLogs = await contract.queryFilter(
    // contract.filters.Transfer(null, holderAddress)
    contract.filters.Transfer(
      process.env.TARGET_WALLET_ADDRESS,
      process.env.DEPOSITED_ON_WALLET_ADDRESS
    )
  )

  // ⑤ ③と④のログを結合し、EventLogを時間が古いものから順に時系列で並べる。
  const logs = sentLogs
    .concat(receivedLogs)
    .sort(
      (a, b) =>
        a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex
    )
  // ⑥ ⑤のログを操作して、調べたいウォレットが最終的に持っている最新のtokenIdを取得する
  const owned = new Set<number>()

  for (const log of logs) {
    if (log.args) {
      const { from, to, tokenId } = log.args

      if (isAddressesEqual(to, holderAddress)) {
        owned.add(Number(tokenId))
      } else if (isAddressesEqual(from, holderAddress)) {
        owned.delete(Number(tokenId))
      }
    }
  }

  // ⑦ Setをarrayに戻して返却
  return Array.from(owned)
}

// 実行
getCollection(process.env.DEPOSITED_ON_WALLET_ADDRESS as string).then(
  (result) => {
    console.log('result', result)
  }
)
