// Shared "does this order belong to this user" logic.
// Every comparison requires BOTH sides to be a non-empty value before matching —
// otherwise two accounts that both lack an email/phone (e.g. guest or phone-only
// signups, which TopupModal/GameTopupPage create with userId/userEmail defaulted
// to '') would collide on '' === '' and leak each other's orders.
export function orderBelongsToUser(order, userProfile) {
  if (!order || !userProfile) return false;
  const matchUid = Boolean(userProfile.uid) && order.userId === userProfile.uid;
  const matchEmail = Boolean(userProfile.email) && Boolean(order.userEmail) &&
    order.userEmail.toLowerCase() === userProfile.email.toLowerCase();
  const matchPhone = Boolean(userProfile.phone) && Boolean(order.phone) &&
    order.phone === userProfile.phone;
  return matchUid || matchEmail || matchPhone;
}

// Newest first. Orders arrive in database key order (random ids), so without
// this a fresh order could land anywhere in the history list.
const orderTime = (o) => {
  const t = new Date(o?.createdAt || o?.timestamp || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};
export function sortOrdersNewestFirst(orders) {
  return [...(orders || [])].sort((a, b) => orderTime(b) - orderTime(a));
}

export function filterUserOrders(orders, userProfile) {
  if (!userProfile || (!userProfile.uid && !userProfile.email && !userProfile.phone)) return [];
  return sortOrdersNewestFirst((orders || []).filter(o => orderBelongsToUser(o, userProfile)));
}
