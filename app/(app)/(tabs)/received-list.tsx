// app/(app)/(tabs)/received-list.tsx  — Received Stocks List

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { Badge, Card, EmptyState } from "@/src/components/UI";
import { useAppStore } from "@/src/store/appStore";
import { ReceivedStock } from "@/src/types";
import { formatDate } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/theme";

const STATUS_COLOR: Record<string, string> = {
  pending: C.accentOrange,
  posted: C.accent,
  cancelled: C.error,
};

export default function ReceivedListScreen() {
  const { selectedStore } = useAppStore();

  const [items, setItems] = useState<ReceivedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    load(true);
  }, [search, dateFrom, dateTo, selectedStore]);

  const load = async (reset = false) => {
    const pg = reset ? 1 : page;
    if (reset) {
      setLoading(true);
      setPage(1);
    }
    try {
      const res = await api.getReceivedStocks({
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        store_id: selectedStore?.id,
        page: pg,
      });
      const data = res.data;
      setItems(reset ? data : (prev) => [...prev, ...data]);
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
  }, [search, dateFrom, dateTo, selectedStore]);

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  const renderItem = ({ item }: { item: ReceivedStock }) => (
    <Card style={s.itemCard}>
      <View style={s.itemTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.refNo}>{item.reference_number}</Text>
          <Text style={s.itemDate}>{formatDate(item.date)}</Text>
        </View>
        <Badge
          label={item.status ?? "pending"}
          color={STATUS_COLOR[item.status ?? "pending"]}
          bg={STATUS_COLOR[item.status ?? "pending"] + "20"}
        />
      </View>

      <View style={s.sep} />

      <View style={s.details}>
        <Row
          icon="cube-outline"
          text={item.item?.description ?? `Item #${item.item_id}`}
        />
        <Row icon="layers-outline" text={`Qty: ${item.quantity}`} />
        <Row
          icon="business-outline"
          text={item.supplier?.name ?? `Supplier #${item.supplier_id}`}
        />
        {item.store?.name && (
          <Row icon="storefront-outline" text={item.store.name} />
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Received Stocks</Text>
        <TouchableOpacity onPress={() => setShowFilter((v) => !v)} hitSlop={10}>
          <Ionicons
            name="options-outline"
            size={22}
            color={showFilter ? C.primary : C.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={s.searchBar}>
        <Ionicons
          name="search-outline"
          size={17}
          color={C.textTertiary}
          style={{ marginRight: S.sm }}
        />
        <TextInput
          style={s.searchInput}
          placeholder="Search ref. no., item, supplier…"
          placeholderTextColor={C.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={17} color={C.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Date filter */}
      {showFilter && (
        <View style={s.filterPanel}>
          <View style={s.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.filterLabel}>From</Text>
              <TextInput
                style={s.dateInput}
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textDisabled}
              />
            </View>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={C.textTertiary}
              style={{ marginTop: 20 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.filterLabel}>To</Text>
              <TextInput
                style={s.dateInput}
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textDisabled}
              />
            </View>
            <TouchableOpacity onPress={clearFilters} style={{ paddingTop: 18 }}>
              <Ionicons name="close-circle-outline" size={22} color={C.error} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
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
              icon="receipt-outline"
              title="No records found"
              subtitle="Adjust filters or pull to refresh"
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
    </SafeAreaView>
  );
}

function Row({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: S.sm,
        marginTop: 3,
      }}>
      <Ionicons name={icon} size={13} color={C.textTertiary} />
      <Text
        style={{ fontSize: F.sm, color: C.textSecondary, flex: 1 }}
        numberOfLines={1}>
        {text}
      </Text>
    </View>
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

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgInput,
    marginHorizontal: S.lg,
    marginVertical: S.md,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: F.md },

  filterPanel: {
    paddingHorizontal: S.lg,
    paddingBottom: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  filterLabel: { fontSize: F.xs, color: C.textTertiary, marginBottom: 4 },
  dateInput: {
    backgroundColor: C.bgInput,
    borderRadius: R.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    color: C.textPrimary,
    fontSize: F.sm,
    borderWidth: 1,
    borderColor: C.border,
  },

  list: { padding: S.lg, paddingBottom: 80 },

  itemCard: { padding: S.md },
  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  refNo: { fontSize: F.md, fontWeight: W.bold, color: C.textPrimary },
  itemDate: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },
  sep: { height: 1, backgroundColor: C.border, marginVertical: S.sm },
  details: { gap: 2 },
});
