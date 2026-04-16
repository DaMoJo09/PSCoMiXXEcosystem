import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  schoolSafePolicies,
  schoolMemberships,
  classroomMemberships,
  classrooms,
  schools,
  type SchoolSafePolicy,
} from "@shared/schema";

export interface EffectivePolicy {
  messaging: boolean;
  matureContent: boolean;
  marketplace: boolean;
  externalPublishing: boolean;
  publicProfile: boolean;
  remixCollab: boolean;
  moderatedPublishing: boolean;
  externalContact: boolean;
  allowedContentCategories: string[] | null;
  allowedAssetPacks: string[] | null;
  allowedTemplates: string[] | null;
  customRules: Record<string, unknown> | null;
  appliedPolicies: { scope: string; label: string; id: string }[];
  schoolSafeActive: boolean;
}

const DEFAULT_OPEN_POLICY: EffectivePolicy = {
  messaging: true,
  matureContent: true,
  marketplace: true,
  externalPublishing: true,
  publicProfile: true,
  remixCollab: true,
  moderatedPublishing: false,
  externalContact: true,
  allowedContentCategories: null,
  allowedAssetPacks: null,
  allowedTemplates: null,
  customRules: null,
  appliedPolicies: [],
  schoolSafeActive: false,
};

function mergePolicies(base: EffectivePolicy, policy: SchoolSafePolicy): EffectivePolicy {
  return {
    messaging: base.messaging && (policy.messagingAllowed ?? false),
    matureContent: base.matureContent && (policy.matureContentAllowed ?? false),
    marketplace: base.marketplace && (policy.marketplaceAllowed ?? false),
    externalPublishing: base.externalPublishing && (policy.externalPublishingAllowed ?? false),
    publicProfile: base.publicProfile && (policy.publicProfileAllowed ?? false),
    remixCollab: base.remixCollab && (policy.remixCollabAllowed ?? true),
    moderatedPublishing: base.moderatedPublishing || (policy.moderatedPublishing ?? true),
    externalContact: base.externalContact && (policy.externalContactAllowed ?? false),
    allowedContentCategories: policy.allowedContentCategories
      ? (policy.allowedContentCategories as string[])
      : base.allowedContentCategories,
    allowedAssetPacks: policy.allowedAssetPacks
      ? (policy.allowedAssetPacks as string[])
      : base.allowedAssetPacks,
    allowedTemplates: policy.allowedTemplates
      ? (policy.allowedTemplates as string[])
      : base.allowedTemplates,
    customRules: policy.customRules
      ? { ...base.customRules, ...(policy.customRules as Record<string, unknown>) }
      : base.customRules,
    appliedPolicies: [
      ...base.appliedPolicies,
      { scope: policy.scope, label: policy.label, id: policy.id },
    ],
    schoolSafeActive: true,
  };
}

export async function resolveEffectivePolicy(userId: string): Promise<EffectivePolicy> {
  const membershipRows = await db.execute(sql.raw(`
    SELECT sm.school_id, sm.role AS school_role
    FROM school_memberships sm
    WHERE sm.user_id = '${userId}'
    LIMIT 1
  `));

  const membership = (membershipRows as any).rows?.[0];
  if (!membership) {
    return { ...DEFAULT_OPEN_POLICY };
  }

  const schoolId = membership.school_id;

  const schoolRows = await db.execute(sql.raw(`
    SELECT s.id, d.id AS district_id
    FROM schools s
    LEFT JOIN districts d ON d.id = (
      SELECT sp.scope_id FROM school_safe_policies sp
      WHERE sp.scope = 'district' AND sp.school_id = s.id AND sp.enabled = true
      LIMIT 1
    )
    WHERE s.id = '${schoolId}'
  `));

  const classroomRows = await db.execute(sql.raw(`
    SELECT cm.classroom_id
    FROM classroom_memberships cm
    JOIN classrooms c ON c.id = cm.classroom_id
    WHERE cm.user_id = '${userId}' AND c.school_id = '${schoolId}'
  `));

  const classroomIds = ((classroomRows as any).rows || []).map((r: any) => r.classroom_id);

  const policyRows = await db.execute(sql.raw(`
    SELECT * FROM school_safe_policies
    WHERE enabled = true AND (
      (scope = 'school' AND scope_id = '${schoolId}')
      ${classroomIds.length > 0 ? `OR (scope = 'classroom' AND scope_id IN (${classroomIds.map((id: string) => `'${id}'`).join(",")}))` : ""}
      OR (scope = 'user' AND scope_id = '${userId}')
      OR (scope = 'district' AND school_id = '${schoolId}')
    )
    ORDER BY
      CASE scope
        WHEN 'district' THEN 1
        WHEN 'school' THEN 2
        WHEN 'classroom' THEN 3
        WHEN 'user' THEN 4
      END ASC
  `));

  const policies = (policyRows as any).rows || [];

  if (policies.length === 0) {
    return { ...DEFAULT_OPEN_POLICY };
  }

  let effective = { ...DEFAULT_OPEN_POLICY };
  for (const p of policies) {
    const mapped: SchoolSafePolicy = {
      id: p.id,
      scope: p.scope,
      scopeId: p.scope_id,
      schoolId: p.school_id,
      parentPolicyId: p.parent_policy_id,
      label: p.label,
      enabled: p.enabled,
      messagingAllowed: p.messaging_allowed,
      matureContentAllowed: p.mature_content_allowed,
      marketplaceAllowed: p.marketplace_allowed,
      externalPublishingAllowed: p.external_publishing_allowed,
      publicProfileAllowed: p.public_profile_allowed,
      remixCollabAllowed: p.remix_collab_allowed,
      moderatedPublishing: p.moderated_publishing,
      externalContactAllowed: p.external_contact_allowed,
      allowedContentCategories: p.allowed_content_categories,
      allowedAssetPacks: p.allowed_asset_packs,
      allowedTemplates: p.allowed_templates,
      customRules: p.custom_rules,
      createdBy: p.created_by,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
    effective = mergePolicies(effective, mapped);
  }

  return effective;
}

export async function createPolicy(data: {
  scope: string;
  scopeId: string;
  schoolId?: string;
  parentPolicyId?: string;
  label: string;
  enabled?: boolean;
  messagingAllowed?: boolean;
  matureContentAllowed?: boolean;
  marketplaceAllowed?: boolean;
  externalPublishingAllowed?: boolean;
  publicProfileAllowed?: boolean;
  remixCollabAllowed?: boolean;
  moderatedPublishing?: boolean;
  externalContactAllowed?: boolean;
  allowedContentCategories?: string[];
  allowedAssetPacks?: string[];
  allowedTemplates?: string[];
  customRules?: Record<string, unknown>;
  createdBy?: string;
}): Promise<SchoolSafePolicy> {
  const cols = Object.entries(data).filter(([, v]) => v !== undefined);
  const colNames = cols.map(([k]) => {
    return k.replace(/([A-Z])/g, "_$1").toLowerCase();
  });
  const values = cols.map(([, v]) => {
    if (typeof v === "object" && v !== null) return `'${JSON.stringify(v)}'::jsonb`;
    if (typeof v === "boolean") return v ? "true" : "false";
    return `'${String(v).replace(/'/g, "''")}'`;
  });

  const result = await db.execute(sql.raw(`
    INSERT INTO school_safe_policies (${colNames.join(", ")})
    VALUES (${values.join(", ")})
    RETURNING *
  `));

  return (result as any).rows[0];
}

export async function updatePolicy(id: string, updates: Record<string, unknown>): Promise<SchoolSafePolicy | null> {
  const setClauses = Object.entries(updates)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const col = k.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (typeof v === "object" && v !== null) return `${col} = '${JSON.stringify(v)}'::jsonb`;
      if (typeof v === "boolean") return `${col} = ${v}`;
      if (v === null) return `${col} = NULL`;
      return `${col} = '${String(v).replace(/'/g, "''")}'`;
    });

  if (setClauses.length === 0) return null;
  setClauses.push(`updated_at = NOW()`);

  const result = await db.execute(sql.raw(`
    UPDATE school_safe_policies SET ${setClauses.join(", ")} WHERE id = '${id}' RETURNING *
  `));

  return (result as any).rows?.[0] || null;
}

export async function getPoliciesForSchool(schoolId: string): Promise<SchoolSafePolicy[]> {
  const result = await db.execute(sql.raw(`
    SELECT * FROM school_safe_policies WHERE school_id = '${schoolId}' OR (scope = 'school' AND scope_id = '${schoolId}')
    ORDER BY scope ASC, created_at ASC
  `));
  return (result as any).rows || [];
}

export async function deletePolicy(id: string): Promise<boolean> {
  const result = await db.execute(sql.raw(`DELETE FROM school_safe_policies WHERE id = '${id}'`));
  return ((result as any).rowCount || 0) > 0;
}
