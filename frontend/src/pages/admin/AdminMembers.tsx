import { Button, Card, Tag, Toast } from 'antd-mobile';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import { IconMe } from '../../components/icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth';
import type { FamilyMember, Role } from '../../types';

export default function AdminMembers() {
  const navigate = useNavigate();
  const { member: currentMember } = useAuthStore();
  const [members, setMembers] = useState<FamilyMember[]>([]);

  const load = useCallback(async () => {
    try {
      setMembers(await api.listMembers());
    } catch (error) {
      Toast.show({ content: (error as Error).message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeRole(target: FamilyMember, role: Role) {
    try {
      await api.updateMemberRole(target.id, role);
      Toast.show({ content: '已更新角色' });
      await load();
    } catch (error) {
      Toast.show({ content: (error as Error).message });
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header-title">成员与权限</h1>
        <p className="page-header-sub">管理员可维护菜单、餐次与成员角色；成员可点菜与查看总单</p>
      </header>

      {members.length === 0 ? (
        <EmptyState
          icon={<IconMe size={28} />}
          title="还没有成员"
          description="把家庭口令分享给家人，加入后即可一起点菜"
        />
      ) : (
        <Card title="家庭成员">
          <div>
            {members.map((member) => {
              const isSelf = member.id === currentMember?.id;
              return (
                <div className="list-row" key={member.id}>
                  <div className="list-row-main">
                    <span className="mr-2">
                      {member.avatar} {member.nickname}
                    </span>
                    <Tag color={member.role === 'ADMIN' ? 'primary' : 'default'}>
                      {member.role === 'ADMIN' ? '管理员' : '成员'}
                    </Tag>
                    {isSelf && <Tag color="warning">我</Tag>}
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={isSelf}
                    onClick={() => changeRole(member, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                  >
                    {member.role === 'ADMIN' ? '降为成员' : '设为管理员'}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="page-footer">
        <Button block onClick={() => navigate('/order')}>
          返回点菜
        </Button>
      </div>
    </div>
  );
}
