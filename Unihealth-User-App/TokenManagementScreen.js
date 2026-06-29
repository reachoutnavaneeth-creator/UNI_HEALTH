// TokenManagementScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { getDatabase, ref, onValue, update, push } from "firebase/database";
import { Ionicons } from "@expo/vector-icons";

export default function TokenManagementScreen({ route }) {
  const hospitalId = route?.params?.hospitalId;

  const [tokens, setTokens] = useState([]);
  const [filter, setFilter] = useState("all");

  const db = getDatabase();

  useEffect(() => {
    if (!hospitalId) return;

    const tokenRef = ref(db, `hospitals/${hospitalId}/tokens`);
    const unsub = onValue(tokenRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({
          id: key,
          patientName: data[key].patientName || "Patient",
          type: data[key].type || "normal",
          status: data[key].status || "waiting",
          updatedAt: data[key].updatedAt || null,
          tokenNum: data[key].tokenNum || key,
        }));
        setTokens(list);
      } else {
        setTokens([]);
      }
    });

    return () => unsub();
  }, [hospitalId]);

  const handleAction = (tokenId, newStatus) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (!token || !hospitalId) return;

    const nowIso = new Date().toISOString();

    update(ref(db, `hospitals/${hospitalId}/tokens/${tokenId}`), {
      status: newStatus,
      updatedAt: nowIso,
      patientName: token.patientName,
      type: token.type,
    });

    push(ref(db, `audit/token/${hospitalId}`), {
      timestamp: Date.now(),
      action: "token-update",
      details: `Token ${token.tokenNum || tokenId} for ${
        token.patientName
      }: Set to ${newStatus}`,
      performer: "Mobile Admin",
    });
  };

  const filteredData = tokens.filter((t) => {
    if (filter === "all") return true;
    if (filter === "emergency") return t.type === "emergency";
    if (filter === "waiting") return t.status === "waiting";
    return true;
  });

  const getStatusStyle = (status) => {
    if (status === "approved") return { bg: "#dcfce7", text: "#166534" };
    if (status === "delayed") return { bg: "#fef3c7", text: "#92400e" };
    if (status === "cancelled") return { bg: "#fee2e2", text: "#991b1b" };
    return { bg: "#f1f5f9", text: "#475569" };
  };

  const renderToken = ({ item }) => {
    const style = getStatusStyle(item.status);

    return (
      <View style={styles.tokenCard}>
        <View style={styles.cardInfo}>
          <View style={styles.row}>
            <Text style={styles.tokenNum}>{item.tokenNum || item.id}</Text>
            {item.type === "emergency" && (
              <View style={styles.emergencyBadge}>
                <Text style={styles.emText}>SOS</Text>
              </View>
            )}
          </View>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: style.bg },
            ]}
          >
            <Text
              style={[styles.statusText, { color: style.text }]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
          {item.updatedAt && (
            <Text style={styles.updatedText}>
              Updated: {new Date(item.updatedAt).toLocaleTimeString()}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleAction(item.id, "approved")}
            style={styles.actionBtn}
          >
            <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleAction(item.id, "delayed")}
            style={styles.actionBtn}
          >
            <Ionicons name="time-outline" size={22} color="#f97316" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleAction(item.id, "cancelled")}
            style={styles.actionBtn}
          >
            <Ionicons name="close-circle" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Token Queue</Text>

      <View style={styles.filterRow}>
        {["all", "waiting", "emergency"].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.chip,
              filter === f && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                filter === f && styles.chipTextActive,
              ]}
            >
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderToken}
        contentContainerStyle={{ padding: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  title: {
    fontSize: 24,
    fontWeight: "800",
    padding: 20,
    color: "#1e293b",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#1e293b" },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  chipTextActive: { color: "#fff" },
  tokenCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardInfo: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  tokenNum: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1e293b",
    marginRight: 10,
  },
  emergencyBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  emText: {
    color: "#ef4444",
    fontWeight: "900",
    fontSize: 10,
  },
  patientName: {
    fontSize: 16,
    color: "#475569",
    marginVertical: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: "800" },
  updatedText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },
  actions: { flexDirection: "row", alignItems: "center" },
  actionBtn: { marginLeft: 10 },
});