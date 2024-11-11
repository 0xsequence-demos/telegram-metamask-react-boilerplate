import "./Home.css";
import { useCallback, useEffect, useState } from "react";
import { useSDK } from "@metamask/sdk-react";
import { Button, Card, Select, Text } from "@0xsequence/design-system";
import {
  arbitrumNova,
  arbitrumSepolia,
  mainnet,
  polygon,
  polygonAmoy,
} from "viem/chains";
import { numToHex } from "./numToHex";
import { stringToHex } from "viem";

const DEFAULT_NETWORK = arbitrumSepolia;

const supportedChains = [
  arbitrumSepolia,
  arbitrumNova,
  polygon,
  polygonAmoy,
  mainnet,
];

const Home = () => {
  const [address, setAddress] = useState<string | undefined>();
  const { sdk, connected, connecting, chainId, provider } = useSDK();

  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [signedMessage, setSignedMessage] = useState("");
  const [error, setError] = useState("");
  const [chainSwitchError, setChainSwitchError] = useState("");

  const [desiredChainId, setDesiredNetwork] = useState(
    numToHex(DEFAULT_NETWORK.id),
  );

  const [lastNetworkdChangeSource, setLastNetworkdChangeSource] = useState<
    "wallet" | "local"
  >("wallet");

  useEffect(() => {
    setLastNetworkdChangeSource("local");
  }, [desiredChainId]);

  useEffect(() => {
    setLastNetworkdChangeSource("wallet");
  }, [chainId]);

  useEffect(() => {
    if (!connected || !provider || !chainId) {
      return;
    }
    if (
      lastNetworkdChangeSource === "wallet" &&
      chainId &&
      supportedChains.find((c) => numToHex(c.id) === chainId)
    ) {
      setDesiredNetwork(chainId);
      setLastNetworkdChangeSource("wallet");
      return;
    }
    try {
      console.log("change chainId to ", desiredChainId);
      provider
        .request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: desiredChainId }],
        })
        .then((res) => {
          console.log("res", res);
          setChainSwitchError("");
        })
        .catch((res) => {
          if (
            res instanceof Object &&
            "data" in res &&
            res.data instanceof Object &&
            "originalError" in res.data &&
            res.data.originalError instanceof Object &&
            "code" in res.data.originalError &&
            res.data.originalError.code === 4902
          ) {
            setChainSwitchError(res.message);

            console.log("add chainId");
            const chainInfo = supportedChains.find(
              (c) => numToHex(c.id) === desiredChainId,
            );
            if (chainInfo) {
              const chainParams = {
                chainId: desiredChainId,
                chainName: chainInfo.name,
                rpcUrls: chainInfo.rpcUrls.default.http,
                nativeCurrency: chainInfo.nativeCurrency,
                blockExplorerUrls: [chainInfo.blockExplorers.default.url],
              };
              console.log(chainParams);
              provider
                .request({
                  method: "wallet_addEthereumChain",
                  params: [chainParams],
                })
                .then((res) => {
                  console.log("res2", res);
                  setChainSwitchError("");
                })
                .catch((res) => {
                  if (
                    res instanceof Object &&
                    "data" in res &&
                    res.data instanceof Object &&
                    "originalError" in res.data
                  ) {
                    setChainSwitchError(res.message);
                  }
                  console.error(res);
                });
            }
          }
          console.error(res);
          setChainSwitchError(res.message);
        });
    } catch (error) {
      setChainSwitchError(JSON.stringify(error));
      //
    }
  }, [chainId, connected, desiredChainId, lastNetworkdChangeSource, provider]);

  const connect = useCallback(async () => {
    if (connecting) {
      return;
    }
    setError("");
    try {
      const accounts = await sdk?.connect();
      setAddress(accounts?.[0]);
    } catch (err) {
      console.warn("failed to connect..", err);
      if (
        err instanceof Object &&
        "message" in err &&
        typeof err.message === "string"
      ) {
        setError(err.message);
      }
    }
  }, [connecting, sdk]);

  const connectAndSign = useCallback(async () => {
    if (isSigningMessage || !sdk) {
      return;
    }
    setSignedMessage("");
    setIsSigningMessage(true);
    try {
      const msg = stringToHex("hello world");
      const smsg = await sdk?.connectAndSign({ msg });
      setSignedMessage(smsg);
    } catch (err: unknown) {
      console.warn("failed to connect..", err);
      if (
        err instanceof Object &&
        "message" in err &&
        typeof err.message === "string"
      ) {
        setError(err.message);
      }
    }
    setIsSigningMessage(false);
  }, [isSigningMessage, sdk]);

  const disconnect = useCallback(() => {
    setIsSigningMessage(false);
    setSignedMessage("");
    setError("");
    localStorage.clear();
    if (!sdk) {
      return;
    }
    sdk.disconnect();
  }, [sdk]);

  useEffect(() => {
    if (connected) {
      connect();
    }
  }, [connect, connected]);

  const onSwitchChain = useCallback((newChainId: string) => {
    setLastNetworkdChangeSource("local");
    setDesiredNetwork(newChainId);
  }, []);

  const networkPleaseWait = desiredChainId !== chainId;

  return (
    <div className="space-children">
      <h1>Telegram Metamask Starter - React</h1>
      {window.location.href.includes("dev.") && <h3>(dev)</h3>}
      {window.location.href.includes("localhost") && <h3>(localhost)</h3>}
      {connected ? (
        <>
          <Text
            variant="large"
            fontWeight="bold"
            color="text100"
            className="wrap space-children"
          >
            Connected as: {address}
          </Text>
          <br />
          <div className={`network ${networkPleaseWait ? "please-wait" : ""}`}>
            <Text
              variant="large"
              fontWeight="bold"
              color="text100"
              className="wrap space-children"
            >
              active chain:{" "}
              {supportedChains.find((c) => numToHex(c.id) === chainId)?.name ||
                "chain unsupported by this dapp, switching to a supported chain"}
            </Text>
            <Select
              onValueChange={onSwitchChain}
              disabled={networkPleaseWait}
              name="switchChain"
              options={supportedChains?.map((chain) => ({
                label: chain.name,
                value: numToHex(chain.id),
              }))}
              defaultValue={desiredChainId}
              value={desiredChainId}
            />
          </div>
          <br />
          <Button onClick={connectAndSign} label="Sign Message" />
          <Button onClick={disconnect} label="Disconnect" />
        </>
      ) : (
        <>
          <p>Not connected</p>
          <div
            className={`card ${isSigningMessage || connecting ? "faded" : ""}`}
          >
            <Button onClick={connect} label="Connect" />
          </div>
        </>
      )}
      {connecting && (
        <>
          <p>please wait...</p>
          <p>
            stuck? Try <a href="">reloading</a>
          </p>
        </>
      )}
      {chainSwitchError && (
        <Card className={`status-card red`}>
          <p>{chainSwitchError}</p>
        </Card>
      )}
      {(isSigningMessage || signedMessage || error) && (
        <Card
          className={`status-card ${
            isSigningMessage ? "yellow" : signedMessage ? "green" : "red"
          }`}
        >
          {error && <p>{error}</p>}
          {isSigningMessage && <p className="break-word">signing message...</p>}
          {signedMessage && (
            <p className="break-word">signed message: {signedMessage}</p>
          )}
        </Card>
      )}
    </div>
  );
};

export default Home;
