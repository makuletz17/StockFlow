// src/components/BarcodeScannerModal.tsx

import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { C, F, R, S, W } from "../utils/themes";

const { width } = Dimensions.get("window");
const FRAME = width * 0.72;
const CW = 26;
const CT = 3;

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
  title?: string;
}

export default function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
  title = "Scan Barcode",
}: Props) {
  const [permission, setPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const line = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setScanned(false);
    Camera.requestCameraPermissionsAsync()
      .then(({ status }) => setPermission(status === "granted"))
      .catch(() => setPermission(false));
    startAnim();
  }, [visible]);

  const startAnim = () => {
    line.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(line, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(line, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const onCode = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
    onClose();
  };

  const lineY = line.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME - 4],
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.btn}>
            <Ionicons name="close" size={24} color={C.white} />
          </TouchableOpacity>
          <Text style={s.title}>{title}</Text>
          <TouchableOpacity onPress={() => setTorch((t) => !t)} style={s.btn}>
            <Ionicons
              name={torch ? "flash" : "flash-off"}
              size={24}
              color={torch ? C.accentOrange : C.white}
            />
          </TouchableOpacity>
        </View>

        {permission === null && (
          <View style={s.center}>
            <Text style={s.msg}>Requesting camera…</Text>
          </View>
        )}
        {permission === false && (
          <View style={s.center}>
            <Ionicons name="camera-outline" size={60} color={C.textTertiary} />
            <Text style={s.msg}>Camera access denied</Text>
            <Text style={s.sub}>Enable it in device Settings.</Text>
          </View>
        )}

        {permission && (
          <>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: [
                  "ean13",
                  "ean8",
                  "qr",
                  "code128",
                  "code39",
                  "upc_a",
                  "upc_e",
                  "pdf417",
                ],
              }}
              onBarcodeScanned={scanned ? undefined : onCode}
            />
            <View style={s.overlay}>
              <View style={s.shadeTop} />
              <View style={s.mid}>
                <View style={s.side} />
                <View style={s.frame}>
                  {/* Corner brackets */}
                  {(["tl", "tr", "bl", "br"] as const).map((c) => (
                    <View
                      key={c}
                      style={[
                        s.corner,
                        {
                          top: c[0] === "t" ? 0 : undefined,
                          bottom: c[0] === "b" ? 0 : undefined,
                          left: c[1] === "l" ? 0 : undefined,
                          right: c[1] === "r" ? 0 : undefined,
                        },
                      ]}>
                      <View
                        style={[s.cH, c[0] === "b" && { marginTop: CW - CT }]}
                      />
                      <View
                        style={[
                          s.cV,
                          c[1] === "r" && { alignSelf: "flex-end" },
                        ]}
                      />
                    </View>
                  ))}
                  <Animated.View
                    style={[s.scanLine, { transform: [{ translateY: lineY }] }]}
                  />
                </View>
                <View style={s.side} />
              </View>
              <View style={s.shadeBot}>
                <Text style={s.hint}>Point at a barcode to scan</Text>
                {scanned && (
                  <TouchableOpacity
                    style={s.rescanBtn}
                    onPress={() => setScanned(false)}>
                    <Text style={s.rescanTxt}>Tap to Scan Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg,
    paddingTop: 56,
    paddingBottom: S.lg,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  title: { fontSize: F.lg, fontWeight: W.bold, color: C.white },
  btn: { padding: S.sm },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: S.xl,
  },
  msg: { fontSize: F.lg, color: C.white, textAlign: "center", marginTop: S.lg },
  sub: {
    fontSize: F.sm,
    color: C.textTertiary,
    textAlign: "center",
    marginTop: S.sm,
  },

  overlay: { ...StyleSheet.absoluteFillObject },
  shadeTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)" },
  mid: { flexDirection: "row", height: FRAME },
  side: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)" },
  shadeBot: {
    flex: 1.2,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: S.xl,
  },
  frame: { width: FRAME, height: FRAME, overflow: "hidden" },

  corner: { position: "absolute", width: CW, height: CW },
  cH: { height: CT, backgroundColor: C.primary },
  cV: { width: CT, height: CW, backgroundColor: C.primary },

  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  hint: { fontSize: F.sm, color: "rgba(255,255,255,0.7)", textAlign: "center" },
  rescanBtn: {
    marginTop: S.lg,
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    backgroundColor: C.primary,
    borderRadius: R.full,
  },
  rescanTxt: { fontSize: F.md, color: C.white, fontWeight: W.semibold },
});
