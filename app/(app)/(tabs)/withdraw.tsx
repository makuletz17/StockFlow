import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { Badge, Card, EmptyState } from "@/src/components/UI";
import WithdrawFormModal from "@/src/tabs/withdraw/WithdrawFormModal";
import { Withdrawal } from "@/src/types";
import { C, F, S, W } from "@/src/utils/theme";

// WithdrawScreen — list of withdrawal records
export default function WithdrawScreen() {
  const [records, setRecords] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [formModal, setFormModal] = useState(false);

  useEffect(() => {
    load(true);
  }, []);

  const load = async (reset = false) => {
    const pg = reset ? 1 : page;
    if (reset) {
      setLoading(true);
      setPage(1);
    }
    try {
      const res = await api.getWithdrawals({ page: pg });
      setRecords((prev) => (reset ? res.data : [...prev, ...res.data]));
      setHasMore(!!res.pagination && pg < res.pagination.total_pages);
      if (!reset) setPage(pg + 1);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, []);

  const renderRecord = ({ item }: { item: Withdrawal }) => {
    const totalQty = item.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
    const totalAmt =
      item.items?.reduce((s, i) => {
        return s + i.unit_price * (1 - (i.discount_percent ?? 0) / 100) * i.qty;
      }, 0) ?? 0;
    const hasDiscount = item.items?.some((i) => (i.discount_percent ?? 0) > 0);

    return (
      <Card style={s.row}>
        <View style={s.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowSupplier} numberOfLines={1}>
              {(item as any).supplier?.name ?? `Supplier #${item.supplier_id}`}
            </Text>
            <Text style={s.rowReason} numberOfLines={1}>
              {item.reason}
            </Text>
            <Text style={s.rowMeta}>
              {item.withdrawn_by}
              {item.created_at
                ? `  ·  ${new Date(item.created_at).toLocaleDateString()}`
                : ""}
            </Text>
          </View>
          <View style={s.amtBox}>
            <Text style={s.amtVal}>₱{totalAmt.toFixed(2)}</Text>
            <Text style={s.amtQty}>{totalQty} PCS</Text>
            {hasDiscount && (
              <Badge
                label="Discounted"
                color={C.warning}
                bg={C.warning + "18"}
              />
            )}
          </View>
        </View>
        <View style={s.rowBot}>
          <Badge
            label={`${item.items?.length ?? 0} item${(item.items?.length ?? 0) !== 1 ? "s" : ""}`}
            color={C.primary}
            bg={C.primary + "18"}
          />
          <Text style={s.rowApproved}>
            <Ionicons
              name="checkmark-circle-outline"
              size={12}
              color={C.accent}
            />
            {"  Approved by: "}
            {item.approved_by}
          </Text>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Withdrawals</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderRecord}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
            />
          }
          onEndReached={() => {
            if (hasMore) load();
          }}
          onEndReachedThreshold={0.4}
          ItemSeparatorComponent={() => <View style={{ height: S.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="arrow-undo-circle-outline"
              title="No withdrawals yet"
              subtitle="Tap + to create a new withdrawal"
              action={{
                label: "New Withdrawal",
                onPress: () => setFormModal(true),
              }}
            />
          }
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator
                color={C.primary}
                style={{ paddingVertical: S.lg }}
              />
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setFormModal(true)}>
        <Ionicons name="add" size={30} color={C.white} />
      </TouchableOpacity>

      <WithdrawFormModal
        visible={formModal}
        onClose={() => setFormModal(false)}
        onSubmitted={(record) => setRecords((prev) => [record, ...prev])}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: F.xl, fontWeight: W.bold, color: C.textPrimary },
  list: { padding: S.lg, paddingBottom: 90 },

  // Record card
  row: { padding: S.md },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: S.sm,
  },
  rowSupplier: { fontSize: F.md, fontWeight: W.bold, color: C.textPrimary },
  rowReason: { fontSize: F.sm, color: C.textSecondary, marginTop: 2 },
  rowMeta: { fontSize: F.xs, color: C.textTertiary, marginTop: 3 },
  amtBox: { alignItems: "flex-end", gap: 3 },
  amtVal: { fontSize: F.lg, fontWeight: W.bold, color: C.textPrimary },
  amtQty: { fontSize: F.xs, color: C.textTertiary },
  rowBot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: S.sm,
  },
  rowApproved: { fontSize: F.xs, color: C.textTertiary },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
