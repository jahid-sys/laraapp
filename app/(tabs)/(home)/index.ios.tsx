
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  createdAt: string;
}

export default function HomeScreen() {
  console.log('HomeScreen (iOS): Rendering task management screen');

  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const showError = (message: string) => {
    setErrorModal({ visible: true, message });
  };

  // GET /api/tasks - Fetch all tasks for the authenticated user
  const fetchTasks = useCallback(async () => {
    try {
      console.log('[API] Requesting /api/tasks...');
      const data = await authenticatedGet<Task[]>('/api/tasks');
      console.log('[API] Tasks fetched:', data.length);
      setTasks(data);
    } catch (error: any) {
      console.error('[API] Failed to fetch tasks:', error);
      showError('Failed to load tasks. Please try again.');
    } finally {
      setLoadingTasks(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, fetchTasks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [fetchTasks]);

  // POST /api/tasks - Create a new task
  const handleAddTask = async () => {
    console.log('User tapped Add Task button');
    if (!newTaskTitle.trim()) return;

    setAddingTask(true);
    try {
      console.log('[API] Requesting POST /api/tasks...');
      const newTask = await authenticatedPost<Task>('/api/tasks', {
        title: newTaskTitle.trim(),
        priority: selectedPriority,
      });
      console.log('[API] Task created:', newTask);
      setTasks([newTask, ...tasks]);
      setNewTaskTitle('');
      setSelectedPriority('medium');
      setShowAddModal(false);
    } catch (error: any) {
      console.error('[API] Failed to create task:', error);
      showError('Failed to create task. Please try again.');
    } finally {
      setAddingTask(false);
    }
  };

  // PUT /api/tasks/:id - Toggle task completion
  const handleToggleTask = async (id: string) => {
    console.log('User toggled task:', id);
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Optimistic update
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    setTogglingTaskId(id);

    try {
      console.log('[API] Requesting PUT /api/tasks/' + id + '...');
      const updated = await authenticatedPut<Task>(`/api/tasks/${id}`, {
        completed: !task.completed,
      });
      console.log('[API] Task updated:', updated);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch (error: any) {
      console.error('[API] Failed to toggle task:', error);
      // Revert optimistic update on failure
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: task.completed } : t));
      showError('Failed to update task. Please try again.');
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleDeleteTask = (id: string) => {
    console.log('User requested to delete task:', id);
    setTaskToDelete(id);
    setDeleteModalVisible(true);
  };

  // DELETE /api/tasks/:id - Delete a task
  const confirmDelete = async () => {
    if (!taskToDelete) return;
    setDeletingTask(true);

    // Optimistic update
    const previousTasks = tasks;
    setTasks(tasks.filter(t => t.id !== taskToDelete));
    setDeleteModalVisible(false);

    try {
      console.log('[API] Requesting DELETE /api/tasks/' + taskToDelete + '...');
      await authenticatedDelete(`/api/tasks/${taskToDelete}`);
      console.log('[API] Task deleted:', taskToDelete);
    } catch (error: any) {
      console.error('[API] Failed to delete task:', error);
      // Revert optimistic update on failure
      setTasks(previousTasks);
      showError('Failed to delete task. Please try again.');
    } finally {
      setTaskToDelete(null);
      setDeletingTask(false);
    }
  };

  const cancelDelete = () => {
    console.log('User cancelled delete');
    setTaskToDelete(null);
    setDeleteModalVisible(false);
  };

  const getPriorityColor = (priority: string) => {
    const priorityColors = {
      low: colors.low,
      medium: colors.medium,
      high: colors.high,
    };
    return priorityColors[priority as keyof typeof priorityColors] || colors.medium;
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressText = totalCount > 0 ? `${completedCount} of ${totalCount} completed` : 'No tasks yet';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Lara's Tasks",
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
          headerLargeTitle: true,
        }}
      />
      <View style={styles.container}>
        {/* Header Stats */}
        <View style={styles.headerCard}>
          <Text style={styles.welcomeText}>Hello, Lara! ✨</Text>
          <Text style={styles.progressText}>{progressText}</Text>
        </View>

        {/* Task List */}
        {loadingTasks ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your tasks...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.taskList}
            contentContainerStyle={styles.taskListContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>No tasks yet</Text>
                <Text style={styles.emptySubtext}>Tap the + button to add your first task</Text>
              </View>
            ) : (
              <>
                {tasks.map((task) => {
                  const priorityColor = getPriorityColor(task.priority);
                  const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
                  const isToggling = togglingTaskId === task.id;

                  return (
                    <View key={task.id} style={styles.taskCard}>
                      <TouchableOpacity
                        style={styles.taskCheckbox}
                        onPress={() => handleToggleTask(task.id)}
                        disabled={isToggling}
                      >
                        <View style={[
                          styles.checkbox,
                          task.completed && styles.checkboxCompleted
                        ]}>
                          {isToggling ? (
                            <ActivityIndicator size="small" color={task.completed ? '#FFFFFF' : colors.primary} />
                          ) : task.completed ? (
                            <IconSymbol
                              ios_icon_name="checkmark"
                              android_material_icon_name="check"
                              size={18}
                              color="#FFFFFF"
                            />
                          ) : null}
                        </View>
                      </TouchableOpacity>

                      <View style={styles.taskContent}>
                        <Text style={[
                          styles.taskTitle,
                          task.completed && styles.taskTitleCompleted
                        ]}>
                          {task.title}
                        </Text>
                        <View style={styles.taskMeta}>
                          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                            <Text style={styles.priorityText}>{priorityLabel}</Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteTask(task.id)}
                        disabled={deletingTask}
                      >
                        <IconSymbol
                          ios_icon_name="trash"
                          android_material_icon_name="delete"
                          size={22}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}

        {/* Add Task Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            console.log('User tapped floating add button');
            setShowAddModal(true);
          }}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={28}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Add Task Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Task</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <IconSymbol
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="What needs to be done?"
                placeholderTextColor={colors.textSecondary}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                autoFocus
              />

              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityButtons}>
                {(['low', 'medium', 'high'] as const).map((priority) => {
                  const isSelected = selectedPriority === priority;
                  const priorityColor = getPriorityColor(priority);
                  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

                  return (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        isSelected && { backgroundColor: priorityColor }
                      ]}
                      onPress={() => {
                        console.log('User selected priority:', priority);
                        setSelectedPriority(priority);
                      }}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        isSelected && styles.priorityButtonTextSelected
                      ]}>
                        {priorityLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.addTaskButton, (!newTaskTitle.trim() || addingTask) && styles.addTaskButtonDisabled]}
                onPress={handleAddTask}
                disabled={!newTaskTitle.trim() || addingTask}
              >
                {addingTask ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.addTaskButtonText}>Add Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={deleteModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelDelete}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmTitle}>Delete Task?</Text>
              <Text style={styles.confirmText}>Are you sure you want to delete this task?</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.cancelButton]}
                  onPress={cancelDelete}
                  disabled={deletingTask}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.deleteConfirmButton]}
                  onPress={confirmDelete}
                  disabled={deletingTask}
                >
                  {deletingTask ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        <Modal
          visible={errorModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setErrorModal({ visible: false, message: '' })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmTitle}>⚠️ Oops!</Text>
              <Text style={styles.confirmText}>{errorModal.message}</Text>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton, { alignSelf: 'center', paddingHorizontal: 32 }]}
                onPress={() => setErrorModal({ visible: false, message: '' })}
              >
                <Text style={styles.deleteConfirmButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerCard: {
    backgroundColor: colors.card,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  taskListContent: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  taskCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  priorityButtonTextSelected: {
    color: '#FFFFFF',
  },
  addTaskButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addTaskButtonDisabled: {
    opacity: 0.5,
  },
  addTaskButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  confirmModal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    alignSelf: 'center',
    width: '85%',
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  deleteConfirmButton: {
    backgroundColor: colors.high,
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
